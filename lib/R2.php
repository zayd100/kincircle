<?php
/**
 * Cloudflare R2 Storage Helper
 *
 * Handles presigned URL generation and object operations
 * using AWS Signature Version 4 (S3-compatible)
 */

require_once __DIR__ . '/../r2-config.php';

class R2 {
    private $accessKey;
    private $secretKey;
    private $endpoint;
    private $bucket;
    private $region = 'auto'; // R2 uses 'auto' as region

    public function __construct() {
        $this->accessKey = R2_ACCESS_KEY_ID;
        $this->secretKey = R2_SECRET_ACCESS_KEY;
        $this->endpoint = R2_ENDPOINT;
        $this->bucket = R2_BUCKET;
    }

    /**
     * Generate a presigned URL for uploading a file
     */
    public function getUploadUrl(string $key, string $contentType, int $expiry = null): array {
        $expiry = $expiry ?? R2_PRESIGNED_URL_EXPIRY;

        $url = $this->generatePresignedUrl('PUT', $key, $expiry, [
            'Content-Type' => $contentType
        ]);

        return [
            'url' => $url,
            'key' => $key,
            'method' => 'PUT',
            'headers' => [
                'Content-Type' => $contentType
            ],
            'expires_in' => $expiry
        ];
    }

    /**
     * Generate a presigned URL for downloading/viewing a file
     */
    public function getDownloadUrl(string $key, int $expiry = null): string {
        $expiry = $expiry ?? R2_DOWNLOAD_URL_EXPIRY;
        return $this->generatePresignedUrl('GET', $key, $expiry);
    }

    /**
     * Copy an object from one key to another (used for approval flow)
     */
    public function copyObject(string $sourceKey, string $destKey): bool {
        $date = new DateTime('UTC');
        $dateStr = $date->format('Ymd\THis\Z');
        $dateShort = $date->format('Ymd');

        $host = parse_url($this->endpoint, PHP_URL_HOST);
        $uri = '/' . $this->bucket . '/' . $destKey;

        $headers = [
            'host' => $host,
            'x-amz-copy-source' => '/' . $this->bucket . '/' . $sourceKey,
            'x-amz-date' => $dateStr,
            'x-amz-content-sha256' => 'UNSIGNED-PAYLOAD'
        ];

        $signedHeaders = $this->signRequest('PUT', $uri, '', $headers, $dateStr, $dateShort);

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $this->endpoint . $uri,
            CURLOPT_CUSTOMREQUEST => 'PUT',
            CURLOPT_HTTPHEADER => $this->formatHeaders($signedHeaders),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 300
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return $httpCode >= 200 && $httpCode < 300;
    }

    /**
     * Delete an object
     */
    public function deleteObject(string $key): bool {
        $date = new DateTime('UTC');
        $dateStr = $date->format('Ymd\THis\Z');
        $dateShort = $date->format('Ymd');

        $host = parse_url($this->endpoint, PHP_URL_HOST);
        $uri = '/' . $this->bucket . '/' . $key;

        $headers = [
            'host' => $host,
            'x-amz-date' => $dateStr,
            'x-amz-content-sha256' => 'UNSIGNED-PAYLOAD'
        ];

        $signedHeaders = $this->signRequest('DELETE', $uri, '', $headers, $dateStr, $dateShort);

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $this->endpoint . $uri,
            CURLOPT_CUSTOMREQUEST => 'DELETE',
            CURLOPT_HTTPHEADER => $this->formatHeaders($signedHeaders),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        // 204 No Content is success for DELETE
        return $httpCode >= 200 && $httpCode < 300;
    }

    /**
     * Check if an object exists
     */
    public function objectExists(string $key): bool {
        $date = new DateTime('UTC');
        $dateStr = $date->format('Ymd\THis\Z');
        $dateShort = $date->format('Ymd');

        $host = parse_url($this->endpoint, PHP_URL_HOST);
        $uri = '/' . $this->bucket . '/' . $key;

        $headers = [
            'host' => $host,
            'x-amz-date' => $dateStr,
            'x-amz-content-sha256' => 'UNSIGNED-PAYLOAD'
        ];

        $signedHeaders = $this->signRequest('HEAD', $uri, '', $headers, $dateStr, $dateShort);

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $this->endpoint . $uri,
            CURLOPT_CUSTOMREQUEST => 'HEAD',
            CURLOPT_HTTPHEADER => $this->formatHeaders($signedHeaders),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_NOBODY => true,
            CURLOPT_TIMEOUT => 10
        ]);

        curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return $httpCode === 200;
    }

    /**
     * Generate AWS Signature V4 presigned URL
     */
    private function generatePresignedUrl(string $method, string $key, int $expiry, array $additionalHeaders = []): string {
        $date = new DateTime('UTC');
        $dateStr = $date->format('Ymd\THis\Z');
        $dateShort = $date->format('Ymd');

        $host = parse_url($this->endpoint, PHP_URL_HOST);

        // URI-encode each path segment (but not the slashes)
        $encodedKey = implode('/', array_map('rawurlencode', explode('/', $key)));
        $uri = '/' . $this->bucket . '/' . $encodedKey;

        $credential = $this->accessKey . '/' . $dateShort . '/' . $this->region . '/s3/aws4_request';

        // Build query string for presigned URL
        $queryParams = [
            'X-Amz-Algorithm' => 'AWS4-HMAC-SHA256',
            'X-Amz-Credential' => $credential,
            'X-Amz-Date' => $dateStr,
            'X-Amz-Expires' => $expiry,
            'X-Amz-SignedHeaders' => 'host'
        ];

        ksort($queryParams);
        $queryString = http_build_query($queryParams, '', '&', PHP_QUERY_RFC3986);

        // Canonical request
        $canonicalHeaders = "host:" . $host . "\n";
        $signedHeaders = "host";

        $canonicalRequest = implode("\n", [
            $method,
            $uri,
            $queryString,
            $canonicalHeaders,
            $signedHeaders,
            'UNSIGNED-PAYLOAD'
        ]);

        // String to sign
        $scope = $dateShort . '/' . $this->region . '/s3/aws4_request';
        $stringToSign = implode("\n", [
            'AWS4-HMAC-SHA256',
            $dateStr,
            $scope,
            hash('sha256', $canonicalRequest)
        ]);

        // Calculate signature
        $signature = $this->calculateSignature($stringToSign, $dateShort);

        // Final URL
        return $this->endpoint . $uri . '?' . $queryString . '&X-Amz-Signature=' . $signature;
    }

    /**
     * Sign a request (for direct API calls)
     */
    private function signRequest(string $method, string $uri, string $queryString, array $headers, string $dateStr, string $dateShort): array {
        // Sort and format canonical headers
        ksort($headers);
        $canonicalHeaders = '';
        $signedHeadersList = [];

        foreach ($headers as $key => $value) {
            $canonicalHeaders .= strtolower($key) . ':' . trim($value) . "\n";
            $signedHeadersList[] = strtolower($key);
        }
        $signedHeaders = implode(';', $signedHeadersList);

        // Canonical request
        $canonicalRequest = implode("\n", [
            $method,
            $uri,
            $queryString,
            $canonicalHeaders,
            $signedHeaders,
            $headers['x-amz-content-sha256'] ?? 'UNSIGNED-PAYLOAD'
        ]);

        // String to sign
        $scope = $dateShort . '/' . $this->region . '/s3/aws4_request';
        $stringToSign = implode("\n", [
            'AWS4-HMAC-SHA256',
            $dateStr,
            $scope,
            hash('sha256', $canonicalRequest)
        ]);

        // Calculate signature
        $signature = $this->calculateSignature($stringToSign, $dateShort);

        // Add Authorization header
        $headers['Authorization'] = sprintf(
            'AWS4-HMAC-SHA256 Credential=%s/%s, SignedHeaders=%s, Signature=%s',
            $this->accessKey,
            $scope,
            $signedHeaders,
            $signature
        );

        return $headers;
    }

    /**
     * Calculate AWS Signature V4
     */
    private function calculateSignature(string $stringToSign, string $dateShort): string {
        $kDate = hash_hmac('sha256', $dateShort, 'AWS4' . $this->secretKey, true);
        $kRegion = hash_hmac('sha256', $this->region, $kDate, true);
        $kService = hash_hmac('sha256', 's3', $kRegion, true);
        $kSigning = hash_hmac('sha256', 'aws4_request', $kService, true);

        return hash_hmac('sha256', $stringToSign, $kSigning);
    }

    /**
     * Format headers array for curl
     */
    private function formatHeaders(array $headers): array {
        $formatted = [];
        foreach ($headers as $key => $value) {
            $formatted[] = $key . ': ' . $value;
        }
        return $formatted;
    }

    /**
     * Generate a unique storage key for a file
     */
    public static function generateKey(string $prefix, string $originalName, int $userId): string {
        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        $uuid = bin2hex(random_bytes(16));
        $timestamp = time();

        return sprintf('%s/%d/%s_%d.%s', $prefix, $userId, $uuid, $timestamp, $extension);
    }

    /**
     * Validate file type for photos
     */
    public static function isValidPhotoType(string $mimeType): bool {
        return in_array($mimeType, R2_ALLOWED_PHOTO_TYPES);
    }

    /**
     * Validate file type for media
     */
    public static function isValidMediaType(string $mimeType): bool {
        return in_array($mimeType, R2_ALLOWED_MEDIA_TYPES);
    }

    /**
     * Get max file size for type
     */
    public static function getMaxSize(string $type): int {
        return $type === 'photo' ? R2_MAX_PHOTO_SIZE : R2_MAX_MEDIA_SIZE;
    }
}
