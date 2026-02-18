// config.test.js

describe('Configuration Logic', () => {
    let DVSAAutomation;
    let mockGetValue, mockSetValue, mockRegisterMenuCommand;
    let mockPrompt;

    beforeEach(() => {
        jest.useFakeTimers();
        jest.resetModules();

        // Mock GM_ functions
        mockGetValue = jest.fn();
        mockSetValue = jest.fn();
        mockRegisterMenuCommand = jest.fn();
        global.GM_getValue = mockGetValue;
        global.GM_setValue = mockSetValue;
        global.GM_registerMenuCommand = mockRegisterMenuCommand;

        // Mock DOM/Window
        mockPrompt = jest.fn();
        global.prompt = mockPrompt;

        global.document = {
            head: { appendChild: jest.fn() },
            body: { appendChild: jest.fn(), removeChild: jest.fn() },
            createElement: jest.fn().mockReturnValue({
                innerHTML: '',
                style: {},
                classList: { add: jest.fn(), remove: jest.fn() },
                scrollIntoView: jest.fn()
            }),
            querySelector: jest.fn(),
            addEventListener: jest.fn(),
            title: ''
        };
        global.window = {
            addEventListener: jest.fn(),
            location: { href: '' }
        };
        global.console = { log: jest.fn() };

        // Require the module
        DVSAAutomation = require('./main');
    });

    afterEach(() => {
        jest.useRealTimers();
        delete global.GM_getValue;
        delete global.GM_setValue;
        delete global.GM_registerMenuCommand;
        delete global.prompt;
    });

    test('retrieves configuration from GM_getValue', () => {
        mockGetValue.mockImplementation((key, def) => {
            if (key === 'drivingLicenceNumber') return 'TEST_LICENCE';
            return def;
        });

        expect(DVSAAutomation.drivingLicenceNumber).toBe('TEST_LICENCE');
        expect(mockGetValue).toHaveBeenCalledWith('drivingLicenceNumber', 'Your_Driver_Licence_Here');
    });

    test('configure() prompts user and saves values', () => {
        // Setup current values
        mockGetValue.mockReturnValue('CURRENT_VAL');
        // Setup user input
        mockPrompt.mockReturnValue('NEW_VAL');

        DVSAAutomation.configure();

        // Check if prompt was called for each config
        const keys = ['drivingLicenceNumber', 'testDate', 'postcode', 'instructorReferenceNumber'];

        keys.forEach(key => {
            expect(mockGetValue).toHaveBeenCalledWith(key, expect.any(String));
            // We can't easily check the prompt text without matching exact strings, but we can check the default value passed
            expect(mockPrompt).toHaveBeenCalledWith(expect.any(String), 'CURRENT_VAL');
            expect(mockSetValue).toHaveBeenCalledWith(key, 'NEW_VAL');
        });
    });

    test('configure() does not save if user cancels (returns null)', () => {
        mockGetValue.mockReturnValue('CURRENT');
        mockPrompt.mockReturnValue(null); // User cancelled

        DVSAAutomation.configure();

        expect(mockSetValue).not.toHaveBeenCalled();
    });

    test('init registers menu command', () => {
        DVSAAutomation.init();
        expect(mockRegisterMenuCommand).toHaveBeenCalledWith("Configure Script", expect.any(Function));
    });
});
