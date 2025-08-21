import '@testing-library/jest-dom';

// Global test setup for FarmTrack SvelteKit application
// This file runs before all tests

// Mock browser APIs that aren't available in the test environment
Object.defineProperty(window, 'navigator', {
	value: {
		onLine: true,
		serviceWorker: {
			register: vi.fn().mockResolvedValue({}),
			ready: Promise.resolve({})
		}
	},
	writable: true
});

// Mock localStorage
const localStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
	value: localStorageMock,
	writable: true
});

// Mock IndexedDB
const mockIndexedDB = {
	open: vi.fn(),
	deleteDatabase: vi.fn()
};
Object.defineProperty(window, 'indexedDB', {
	value: mockIndexedDB,
	writable: true
});

// Mock Supabase client (will be replaced with actual mock in tests)
global.supabaseClient = {
	from: vi.fn().mockReturnThis(),
	select: vi.fn().mockResolvedValue({ data: [], error: null }),
	insert: vi.fn().mockResolvedValue({ data: [], error: null }),
	update: vi.fn().mockResolvedValue({ data: [], error: null }),
	delete: vi.fn().mockResolvedValue({ data: [], error: null })
};

// Reset all mocks after each test
afterEach(() => {
	vi.clearAllMocks();
});