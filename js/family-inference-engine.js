// Family Relationship Inference Engine
// Calculates indirect relationships from direct claims

class FamilyInferenceEngine {
    constructor() {
        this.directRelationships = new Map();
        this.inferredRelationships = new Map();
        this.relationshipRules = this.initializeInferenceRules();
    }
    
    initializeInferenceRules() {
        return {
            // Level 1 inferences - direct connections
            'parent_sibling': { result: 'uncle_aunt', confidence: 1.0 },
            'child_child': { result: 'sibling', confidence: 0.9 }, // Same parent
            'spouse_parent': { result: 'parent_in_law', confidence: 1.0 },
            'spouse_child': { result: 'child_in_law', confidence: 1.0 },
            'spouse_sibling': { result: 'sibling_in_law', confidence: 1.0 },
            'sibling_child': { result: 'niece_nephew', confidence: 1.0 },
            'parent_parent': { result: 'grandparent', confidence: 1.0 },
            'child_child_of_child': { result: 'grandchild', confidence: 1.0 },
            
            // Level 2 inferences - extended family
            'uncle_aunt_child': { result: 'cousin', confidence: 0.95 },
            'grandparent_sibling': { result: 'great_uncle_aunt', confidence: 0.9 },
            'parent_parent_parent': { result: 'great_grandparent', confidence: 0.95 }
        };
    }
    
    async loadDirectRelationships(userId) {
        try {
            const response = await fetch(`/api/family-relationships.php?action=my_relationships`);
            const data = await response.json();
            
            if (data.success) {
                this.directRelationships.clear();
                
                data.relationships.forEach(rel => {
                    const key = `${rel.other_person_id}_${rel.relationship}`;
                    this.directRelationships.set(key, {
                        personId: rel.other_person_id,
                        personName: rel.other_person_name,
                        relationship: rel.relationship,
                        direction: rel.relationship_direction,
                        confidence: 1.0
                    });
                });
            }
        } catch (error) {
            console.error('Error loading direct relationships:', error);
        }
    }
    
    calculateAllInferences(userId) {
        this.inferredRelationships.clear();
        
        // Level 1 inferences
        this.calculateUnclesAunts(userId);
        this.calculateNiecesNephews(userId);
        this.calculateGrandparents(userId);
        this.calculateGrandchildren(userId);
        this.calculateInLaws(userId);
        this.calculateSiblingsThroughParents(userId);
        
        // Level 2 inferences
        this.calculateCousins(userId);
        this.calculateGreatGrandrelations(userId);
        
        return Array.from(this.inferredRelationships.values());
    }
    
    calculateUnclesAunts(userId) {
        // Parent -> Sibling = Uncle/Aunt
        const parents = this.getRelated(userId, 'parent');
        
        parents.forEach(parent => {
            const parentSiblings = this.getRelated(parent.personId, 'sibling');
            
            parentSiblings.forEach(sibling => {
                this.addInference(userId, sibling.personId, 'uncle_aunt', 
                    `parent(${parent.personName}) -> sibling(${sibling.personName})`, 1.0);
            });
        });
    }
    
    calculateNiecesNephews(userId) {
        // Sibling -> Child = Niece/Nephew
        const siblings = this.getRelated(userId, 'sibling');
        
        siblings.forEach(sibling => {
            const siblingChildren = this.getRelated(sibling.personId, 'child');
            
            siblingChildren.forEach(child => {
                this.addInference(userId, child.personId, 'niece_nephew',
                    `sibling(${sibling.personName}) -> child(${child.personName})`, 1.0);
            });
        });
    }
    
    calculateGrandparents(userId) {
        // Parent -> Parent = Grandparent
        const parents = this.getRelated(userId, 'parent');
        
        parents.forEach(parent => {
            const grandparents = this.getRelated(parent.personId, 'parent');
            
            grandparents.forEach(grandparent => {
                this.addInference(userId, grandparent.personId, 'grandparent',
                    `parent(${parent.personName}) -> parent(${grandparent.personName})`, 1.0);
            });
        });
    }
    
    calculateGrandchildren(userId) {
        // Child -> Child = Grandchild
        const children = this.getRelated(userId, 'child');
        
        children.forEach(child => {
            const grandchildren = this.getRelated(child.personId, 'child');
            
            grandchildren.forEach(grandchild => {
                this.addInference(userId, grandchild.personId, 'grandchild',
                    `child(${child.personName}) -> child(${grandchild.personName})`, 1.0);
            });
        });
    }
    
    calculateInLaws(userId) {
        // Spouse -> Family = In-laws
        const spouses = this.getRelated(userId, 'spouse');
        
        spouses.forEach(spouse => {
            // Spouse's parents = Parents-in-law
            const spouseParents = this.getRelated(spouse.personId, 'parent');
            spouseParents.forEach(parent => {
                this.addInference(userId, parent.personId, 'parent_in_law',
                    `spouse(${spouse.personName}) -> parent(${parent.personName})`, 1.0);
            });
            
            // Spouse's children = Step-children
            const spouseChildren = this.getRelated(spouse.personId, 'child');
            spouseChildren.forEach(child => {
                this.addInference(userId, child.personId, 'step_child',
                    `spouse(${spouse.personName}) -> child(${child.personName})`, 0.9);
            });
            
            // Spouse's siblings = Siblings-in-law
            const spouseSiblings = this.getRelated(spouse.personId, 'sibling');
            spouseSiblings.forEach(sibling => {
                this.addInference(userId, sibling.personId, 'sibling_in_law',
                    `spouse(${spouse.personName}) -> sibling(${sibling.personName})`, 1.0);
            });
        });
    }
    
    calculateSiblingsThroughParents(userId) {
        // Shared parents = Siblings (but be careful about blended families)
        const parents = this.getRelated(userId, 'parent');
        
        parents.forEach(parent => {
            const parentChildren = this.getRelated(parent.personId, 'child');
            
            parentChildren.forEach(child => {
                if (child.personId !== userId) {
                    this.addInference(userId, child.personId, 'sibling_shared_parent',
                        `shared parent(${parent.personName}) -> child(${child.personName})`, 0.8);
                }
            });
        });
    }
    
    calculateCousins(userId) {
        // Parent -> Sibling -> Child = Cousin
        const unclesAunts = this.getInferred(userId, 'uncle_aunt');
        
        unclesAunts.forEach(uncleAunt => {
            const cousinCandidates = this.getRelated(uncleAunt.personId, 'child');
            
            cousinCandidates.forEach(cousin => {
                this.addInference(userId, cousin.personId, 'cousin',
                    `uncle_aunt(${uncleAunt.personName}) -> child(${cousin.personName})`, 0.95);
            });
        });
    }
    
    calculateGreatGrandrelations(userId) {
        // Grandparent -> Parent = Great-grandparent
        const grandparents = this.getInferred(userId, 'grandparent');
        
        grandparents.forEach(grandparent => {
            const greatGrandparents = this.getRelated(grandparent.personId, 'parent');
            
            greatGrandparents.forEach(greatGrand => {
                this.addInference(userId, greatGrand.personId, 'great_grandparent',
                    `grandparent(${grandparent.personName}) -> parent(${greatGrand.personName})`, 0.95);
            });
        });
    }
    
    getRelated(userId, relationship) {
        const results = [];
        
        // Check direct relationships
        for (const [key, rel] of this.directRelationships) {
            if (key.startsWith(`${userId}_`) && rel.relationship === relationship) {
                results.push(rel);
            }
        }
        
        return results;
    }
    
    getInferred(userId, relationship) {
        const results = [];
        
        for (const [key, rel] of this.inferredRelationships) {
            if (key.startsWith(`${userId}_`) && rel.relationship === relationship) {
                results.push(rel);
            }
        }
        
        return results;
    }
    
    addInference(userId, relatedPersonId, relationship, path, confidence) {
        const key = `${userId}_${relatedPersonId}_${relationship}`;
        
        // Don't infer relationships that are already direct
        const directKey = `${relatedPersonId}_${relationship}`;
        if (this.directRelationships.has(directKey)) {
            return;
        }
        
        // Only add if we don't have this inference or this one is more confident
        if (!this.inferredRelationships.has(key) || 
            this.inferredRelationships.get(key).confidence < confidence) {
            
            this.inferredRelationships.set(key, {
                personId: relatedPersonId,
                relationship: relationship,
                inferencePath: path,
                confidence: confidence,
                isInferred: true
            });
        }
    }
    
    formatRelationshipLabel(relationship) {
        const labels = {
            'parent': 'Parent',
            'child': 'Child',
            'sibling': 'Sibling',
            'spouse': 'Spouse',
            'uncle_aunt': 'Uncle/Aunt',
            'niece_nephew': 'Niece/Nephew',
            'grandparent': 'Grandparent',
            'grandchild': 'Grandchild',
            'parent_in_law': 'Parent-in-law',
            'child_in_law': 'Child-in-law',
            'sibling_in_law': 'Sibling-in-law',
            'step_child': 'Step-child',
            'cousin': 'Cousin',
            'great_grandparent': 'Great-grandparent',
            'sibling_shared_parent': 'Sibling (shared parent)'
        };
        
        return labels[relationship] || relationship.replace('_', ' ');
    }
    
    getConfidenceLevel(confidence) {
        if (confidence >= 1.0) return 'confirmed';
        if (confidence >= 0.9) return 'high';
        if (confidence >= 0.7) return 'medium';
        return 'low';
    }
}

// Export for use in other modules
window.FamilyInferenceEngine = FamilyInferenceEngine;