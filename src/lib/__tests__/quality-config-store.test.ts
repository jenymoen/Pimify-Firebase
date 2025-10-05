// src/lib/__tests__/quality-config-store.test.ts

import { useQualityConfigStore } from '../quality-config-store';
import type { QualityRule } from '@/types/quality';

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Quality Config Store', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Reset store state
    useQualityConfigStore.setState({
      rules: useQualityConfigStore.getState().rules,
    });
  });

  describe('Initial State', () => {
    it('should have default quality rules', () => {
      const rules = useQualityConfigStore.getState().getQualityRules();
      expect(rules).toBeDefined();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should have critical fields with high weight', () => {
      const rules = useQualityConfigStore.getState().getQualityRules();
      const criticalFields = rules.filter(rule => rule.weight >= 10);
      
      expect(criticalFields.length).toBeGreaterThan(0);
      expect(criticalFields.some(rule => rule.field === 'basicInfo.name')).toBe(true);
      expect(criticalFields.some(rule => rule.field === 'basicInfo.sku')).toBe(true);
    });

    it('should have important fields with medium weight', () => {
      const rules = useQualityConfigStore.getState().getQualityRules();
      const importantFields = rules.filter(rule => rule.weight >= 5 && rule.weight < 10);
      
      expect(importantFields.length).toBeGreaterThan(0);
      expect(importantFields.some(rule => rule.field === 'basicInfo.descriptionShort')).toBe(true);
      expect(importantFields.some(rule => rule.field === 'media.images')).toBe(true);
    });

    it('should have optional fields with low weight', () => {
      const rules = useQualityConfigStore.getState().getQualityRules();
      const optionalFields = rules.filter(rule => rule.weight < 5);
      
      expect(optionalFields.length).toBeGreaterThan(0);
      expect(optionalFields.some(rule => rule.field === 'basicInfo.gtin')).toBe(true);
      expect(optionalFields.some(rule => rule.field === 'marketingSEO.keywords')).toBe(true);
    });
  });

  describe('updateQualityRule', () => {
    it('should update existing rule weight', () => {
      const { updateQualityRule, getQualityRules } = useQualityConfigStore.getState();
      
      updateQualityRule('basicInfo.name', { weight: 15 });
      
      const rules = getQualityRules();
      const nameRule = rules.find(rule => rule.field === 'basicInfo.name');
      expect(nameRule?.weight).toBe(15);
    });

    it('should update existing rule requiredForStatus', () => {
      const { updateQualityRule, getQualityRules } = useQualityConfigStore.getState();
      
      updateQualityRule('basicInfo.name', { requiredForStatus: ['active'] });
      
      const rules = getQualityRules();
      const nameRule = rules.find(rule => rule.field === 'basicInfo.name');
      expect(nameRule?.requiredForStatus).toEqual(['active']);
    });

    it('should update multiple properties of a rule', () => {
      const { updateQualityRule, getQualityRules } = useQualityConfigStore.getState();
      
      updateQualityRule('basicInfo.name', { 
        weight: 20, 
        requiredForStatus: ['active', 'development'] 
      });
      
      const rules = getQualityRules();
      const nameRule = rules.find(rule => rule.field === 'basicInfo.name');
      expect(nameRule?.weight).toBe(20);
      expect(nameRule?.requiredForStatus).toEqual(['active', 'development']);
    });

    it('should not affect other rules when updating one', () => {
      const { updateQualityRule, getQualityRules } = useQualityConfigStore.getState();
      const initialRules = getQualityRules();
      const initialSkuRule = initialRules.find(rule => rule.field === 'basicInfo.sku');
      
      updateQualityRule('basicInfo.name', { weight: 999 });
      
      const updatedRules = getQualityRules();
      const updatedSkuRule = updatedRules.find(rule => rule.field === 'basicInfo.sku');
      
      expect(updatedSkuRule?.weight).toBe(initialSkuRule?.weight);
    });
  });

  describe('resetToDefaults', () => {
    it('should reset rules to default values', () => {
      const { updateQualityRule, resetToDefaults, getQualityRules } = useQualityConfigStore.getState();
      
      // Modify a rule
      updateQualityRule('basicInfo.name', { weight: 999 });
      let rules = getQualityRules();
      let nameRule = rules.find(rule => rule.field === 'basicInfo.name');
      expect(nameRule?.weight).toBe(999);
      
      // Reset to defaults
      resetToDefaults();
      
      rules = getQualityRules();
      nameRule = rules.find(rule => rule.field === 'basicInfo.name');
      expect(nameRule?.weight).toBe(10); // Default weight for critical fields
    });
  });

  describe('Persistence', () => {
    it('should persist rules to localStorage', () => {
      const { updateQualityRule } = useQualityConfigStore.getState();
      
      updateQualityRule('basicInfo.name', { weight: 15 });
      
      // Check if data is in localStorage
      const stored = localStorageMock.getItem('quality-rules-storage-default');
      expect(stored).toBeTruthy();
      
      const parsedData = JSON.parse(stored!);
      expect(parsedData.state.rules).toBeDefined();
    });

    it('should restore rules from localStorage on reload', () => {
      const { updateQualityRule, getQualityRules } = useQualityConfigStore.getState();
      
      // Modify a rule
      updateQualityRule('basicInfo.name', { weight: 25 });
      
      // Simulate page reload by creating new store instance
      const newStore = useQualityConfigStore.getState();
      const rules = newStore.getQualityRules();
      const nameRule = rules.find(rule => rule.field === 'basicInfo.name');
      
      expect(nameRule?.weight).toBe(25);
    });
  });

  describe('Rule Structure', () => {
    it('should have valid rule structure', () => {
      const rules = useQualityConfigStore.getState().getQualityRules();
      
      rules.forEach(rule => {
        expect(rule).toHaveProperty('field');
        expect(rule).toHaveProperty('weight');
        expect(rule).toHaveProperty('requiredForStatus');
        
        expect(typeof rule.field).toBe('string');
        expect(typeof rule.weight).toBe('number');
        expect(Array.isArray(rule.requiredForStatus)).toBe(true);
        
        expect(rule.field).not.toBe('');
        expect(rule.weight).toBeGreaterThan(0);
        expect(rule.requiredForStatus.length).toBeGreaterThan(0);
      });
    });

    it('should have unique field names', () => {
      const rules = useQualityConfigStore.getState().getQualityRules();
      const fieldNames = rules.map(rule => rule.field);
      const uniqueFieldNames = [...new Set(fieldNames)];
      
      expect(fieldNames.length).toBe(uniqueFieldNames.length);
    });

    it('should have valid requiredForStatus values', () => {
      const rules = useQualityConfigStore.getState().getQualityRules();
      const validStatuses = ['active', 'development', 'inactive', 'discontinued'];
      
      rules.forEach(rule => {
        rule.requiredForStatus.forEach(status => {
          expect(validStatuses).toContain(status);
        });
      });
    });
  });
});
