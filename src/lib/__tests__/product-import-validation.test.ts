import { useProductStore } from '../product-store';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Product Store JSON Import', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    useProductStore.setState({ products: [], isLoading: false, error: null });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  test('successfully imports products with null fields and normalizes payload', async () => {
    let capturedPayload: any = null;

    global.fetch = jest.fn().mockImplementation((url, options) => {
      if (url === '/api/products' && options?.method === 'POST') {
        capturedPayload = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { id: capturedPayload.id, ...capturedPayload },
          }),
        });
      }
      if (url.startsWith('/api/products?')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { products: capturedPayload ? [capturedPayload] : [] },
          }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const importedJson = [
      {
        id: 'imported-prod-1',
        basicInfo: {
          name: { en: 'Test Lamp', no: 'Test Lampe' },
          sku: 'LAMP-001',
          launchDate: null,
          endDate: null,
          gtin: null,
          brand: 'Nordic',
          status: 'development',
        },
        pricingAndStock: {
          standardPrice: [{ id: 'p1', currency: 'NOK', amount: 499 }],
          salePrice: null,
          costPrice: null,
        },
        options: null,
        variants: null,
        workflowState: 'DRAFT',
        assignedReviewer: null,
      },
    ];

    await useProductStore.getState().importProducts(importedJson as any);

    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload.id).toBe('imported-prod-1');
    expect(capturedPayload.basicInfo.sku).toBe('LAMP-001');
    expect(capturedPayload.basicInfo.name).toEqual({ en: 'Test Lamp', no: 'Test Lampe' });
  });

  test('handles flat JSON product format by normalizing into basicInfo', async () => {
    let capturedPayload: any = null;

    global.fetch = jest.fn().mockImplementation((url, options) => {
      if (url === '/api/products' && options?.method === 'POST') {
        capturedPayload = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { id: capturedPayload.id, ...capturedPayload },
          }),
        });
      }
      if (url.startsWith('/api/products?')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { products: [] } }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const flatProduct = [
      {
        id: 'flat-prod-1',
        sku: 'FLAT-123',
        name: 'Flat Product Name',
        brand: 'Pimify Brand',
      },
    ];

    await useProductStore.getState().importProducts(flatProduct as any);

    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload.basicInfo.sku).toBe('FLAT-123');
    expect(capturedPayload.basicInfo.name).toEqual({ en: 'Flat Product Name', no: 'Flat Product Name' });
    expect(capturedPayload.basicInfo.brand).toBe('Pimify Brand');
  });

  test('provides detailed error message when API responds with validation error', async () => {
    global.fetch = jest.fn().mockImplementation((url, options) => {
      if (url === '/api/products' && options?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({
            success: false,
            error: 'Invalid request data',
            details: 'basicInfo.sku: Required',
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { products: [] } }),
      });
    });

    const invalidProduct = [
      {
        id: 'bad-prod',
        basicInfo: {
          name: { en: 'Bad Product', no: '' },
          sku: '',
        },
      },
    ];

    await expect(useProductStore.getState().importProducts(invalidProduct as any)).rejects.toThrow(
      /Invalid request data \(basicInfo.sku: Required\)/
    );
  });
});
