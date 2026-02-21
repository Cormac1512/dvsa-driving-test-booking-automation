// Minimal DOM mock for Node environment
global.document = {
    head: { appendChild: jest.fn() },
    body: {
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        contains: jest.fn().mockReturnValue(true)
    },
    createElement: jest.fn().mockReturnValue({
        innerHTML: '',
        style: {},
        classList: { add: jest.fn(), remove: jest.fn() },
        scrollIntoView: jest.fn()
    }),
    querySelector: jest.fn(),
    addEventListener: jest.fn(),
    title: '',
    location: { href: '' },
    readyState: 'loading'
};
global.window = {
    addEventListener: jest.fn(),
    location: { href: '' },
    crypto: { getRandomValues: jest.fn() }
};
global.console = {
    log: jest.fn(),
    warn: jest.fn()
};
global.GM_setValue = jest.fn();
global.GM_getValue = jest.fn();
global.prompt = jest.fn();
global.alert = jest.fn();
global.requestAnimationFrame = (cb) => cb();

const DVSAAutomation = require('./main');

describe('DVSA Driving Test Booking Automation', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('randomIntBetween returns a number within range', () => {
        for (let i = 0; i < 100; i++) {
            const min = 10;
            const max = 20;
            const result = DVSAAutomation.randomIntBetween(min, max);
            expect(result).toBeGreaterThanOrEqual(min);
            expect(result).toBeLessThanOrEqual(max);
            expect(Number.isInteger(result)).toBe(true);
        }
    });

    test('randomIntBetween uses crypto when available', () => {
        const mockGetRandomValues = jest.fn((array) => {
            array[0] = 12345;
            return array;
        });
        global.window.crypto.getRandomValues = mockGetRandomValues;

        const min = 10;
        const max = 20;
        const result = DVSAAutomation.randomIntBetween(min, max);

        expect(mockGetRandomValues).toHaveBeenCalled();
        expect(result).toBeGreaterThanOrEqual(min);
        expect(result).toBeLessThanOrEqual(max);
    });

    test('randomDelay calls callback after timeout', () => {
        const callback = jest.fn();
        const spySetTimeout = jest.spyOn(global, 'setTimeout');
        DVSAAutomation.randomDelay(callback);
        expect(spySetTimeout).toHaveBeenCalled();
        jest.runAllTimers();
        expect(callback).toHaveBeenCalled();
    });

    test('showToast creates and removes toast element', () => {
        const message = 'Test Toast';
        const duration = 1000;

        DVSAAutomation.showToast(message, duration);

        expect(document.createElement).toHaveBeenCalledWith('div');
        expect(document.body.appendChild).toHaveBeenCalled();

        // Check if toast was created with correct text
        const toast = document.createElement.mock.results[0].value;
        expect(toast.textContent).toBe(message);

        // Fast-forward time to trigger removal
        jest.advanceTimersByTime(duration);
        jest.advanceTimersByTime(500); // fade out time

        // Mock document.body.contains to return true so removal logic runs
        document.body.contains = jest.fn().mockReturnValue(true);

        // Since we are inside nested setTimeout, we need to run pending timers again
        jest.runAllTimers();

        expect(document.body.removeChild).toHaveBeenCalledWith(toast);
    });

    test('selectTestType clicks car test button if it exists', () => {
        const mockBtn = { click: jest.fn() };
        document.querySelector.mockReturnValueOnce(mockBtn);

        DVSAAutomation.selectTestType();

        expect(document.querySelector).toHaveBeenCalledWith(DVSAAutomation.SELECTORS.TEST_TYPE_CAR);
        expect(mockBtn.click).toHaveBeenCalled();
    });

    test('enterLicenceDetails fills licence and submits', () => {
        const mockLicenceInput = { value: '' };
        const mockSpecialNeedsInput = { checked: false };
        const mockSubmitBtn = { click: jest.fn() };

        document.querySelector.mockImplementation((selector) => {
            if (selector === DVSAAutomation.SELECTORS.DRIVING_LICENCE_INPUT) return mockLicenceInput;
            if (selector === DVSAAutomation.SELECTORS.SPECIAL_NEEDS_NONE) return mockSpecialNeedsInput;
            if (selector === DVSAAutomation.SELECTORS.DRIVING_LICENCE_SUBMIT) return mockSubmitBtn;
            return null;
        });

        DVSAAutomation.enterLicenceDetails();

        expect(mockLicenceInput.value).toBe(DVSAAutomation.drivingLicenceNumber);
        expect(mockSpecialNeedsInput.checked).toBe(true);
        expect(mockSubmitBtn.click).toHaveBeenCalled();
    });

    test('enterTestDate fills test date and submits', () => {
        const mockDateInput = { value: '' };
        const mockInstructorInput = { value: '' };
        const mockSubmitBtn = { click: jest.fn() };

        document.querySelector.mockImplementation((selector) => {
            if (selector === DVSAAutomation.SELECTORS.TEST_DATE_INPUT) return mockDateInput;
            if (selector === DVSAAutomation.SELECTORS.INSTRUCTOR_INPUT) return mockInstructorInput;
            if (selector === DVSAAutomation.SELECTORS.DRIVING_LICENCE_SUBMIT) return mockSubmitBtn;
            return null;
        });

        DVSAAutomation.enterTestDate();

        expect(mockDateInput.value).toBe(DVSAAutomation.testDate);
        if (DVSAAutomation.instructorReferenceNumber !== '') {
            expect(mockInstructorInput.value).toBe(DVSAAutomation.instructorReferenceNumber);
        }
        expect(mockSubmitBtn.click).toHaveBeenCalled();
    });

    test('enterPostcode fills postcode and submits', () => {
        const mockPostcodeInput = { value: '' };
        const mockSubmitBtn = { click: jest.fn() };

        document.querySelector.mockImplementation((selector) => {
            if (selector === DVSAAutomation.SELECTORS.POSTCODE_INPUT) return mockPostcodeInput;
            if (selector === DVSAAutomation.SELECTORS.POSTCODE_SUBMIT) return mockSubmitBtn;
            return null;
        });

        DVSAAutomation.enterPostcode();

        expect(mockPostcodeInput.value).toBe(DVSAAutomation.postcode);
        expect(mockSubmitBtn.click).toHaveBeenCalled();
    });

    test('checkResults handles results and clicks fetch more if needed', () => {
        const mockResults = { children: { length: 5 } };
        const mockFetchBtn = { click: jest.fn() };

        document.querySelector.mockImplementation((selector) => {
            if (selector === DVSAAutomation.SELECTORS.TEST_CENTRE_RESULTS) return mockResults;
            if (selector === DVSAAutomation.SELECTORS.FETCH_MORE_CENTRES) return mockFetchBtn;
            return null;
        });

        DVSAAutomation.checkResults();
        expect(mockFetchBtn.click).toHaveBeenCalled();

        jest.runAllTimers();
        expect(document.location.href).toBe("https://driverpracticaltest.dvsa.gov.uk/application");
    });

    test('handlePage routes correctly based on existing elements', () => {
        const spyRandomDelay = jest.spyOn(DVSAAutomation, 'randomDelay');

        const testCases = [
            { selector: DVSAAutomation.SELECTORS.TEST_TYPE_CAR, step: DVSAAutomation.selectTestType },
            { selector: DVSAAutomation.SELECTORS.DRIVING_LICENCE_INPUT, step: DVSAAutomation.enterLicenceDetails },
            { selector: DVSAAutomation.SELECTORS.TEST_DATE_INPUT, step: DVSAAutomation.enterTestDate },
            { selector: DVSAAutomation.SELECTORS.TEST_CENTRE_RESULTS, step: DVSAAutomation.checkResults },
            { selector: DVSAAutomation.SELECTORS.POSTCODE_INPUT, step: DVSAAutomation.enterPostcode }
        ];

        for (const { selector, step } of testCases) {
            document.querySelector.mockImplementation((sel) => sel === selector ? {} : null);

            DVSAAutomation.handlePage();

            expect(spyRandomDelay).toHaveBeenCalledWith(step);
            spyRandomDelay.mockClear();
        }
    });

    test('handlePage prioritizes checkResults over enterPostcode if results exist', () => {
        const spyRandomDelay = jest.spyOn(DVSAAutomation, 'randomDelay');

        document.querySelector.mockImplementation((selector) => {
            if (selector === DVSAAutomation.SELECTORS.TEST_CENTRE_RESULTS) return {};
            if (selector === DVSAAutomation.SELECTORS.POSTCODE_INPUT) return {}; // Both exist
            return null;
        });

        DVSAAutomation.handlePage();

        expect(spyRandomDelay).toHaveBeenCalledWith(DVSAAutomation.checkResults);
    });


    test('isValidLicence validates correct length and characters', () => {
        expect(DVSAAutomation.isValidLicence('ABCDE12345FGHIJ6')).toBe(true);
        expect(DVSAAutomation.isValidLicence('abcde12345fghij6')).toBe(true);
        expect(DVSAAutomation.isValidLicence('SHORT')).toBe(false);
        expect(DVSAAutomation.isValidLicence('TOO_LONG_LICENCE_NUMBER')).toBe(false);
        expect(DVSAAutomation.isValidLicence('INVALID-CHARS!!')).toBe(false);
    });

    test('isValidPostcode validates UK postcode format', () => {
        expect(DVSAAutomation.isValidPostcode('SW1A 1AA')).toBe(true);
        expect(DVSAAutomation.isValidPostcode('M1 1AA')).toBe(true);
        expect(DVSAAutomation.isValidPostcode('CR2 6XH')).toBe(true);
        expect(DVSAAutomation.isValidPostcode('sw1a 1aa')).toBe(true);
        expect(DVSAAutomation.isValidPostcode('Invalid')).toBe(false);
        expect(DVSAAutomation.isValidPostcode('12345')).toBe(false);
    });

    test('isValidInstructor validates numeric input', () => {
        expect(DVSAAutomation.isValidInstructor('123456')).toBe(true);
        expect(DVSAAutomation.isValidInstructor('01234')).toBe(true);
        expect(DVSAAutomation.isValidInstructor('ABC')).toBe(false);
        expect(DVSAAutomation.isValidInstructor('123A')).toBe(false);
    });

    test('isValidDate validates format and date validity', () => {
        expect(DVSAAutomation.isValidDate('15/08/2024')).toBe(true);
        expect(DVSAAutomation.isValidDate('29/02/2024')).toBe(true); // Leap year
        expect(DVSAAutomation.isValidDate('2024/08/15')).toBe(false); // Wrong format
        expect(DVSAAutomation.isValidDate('15-08-2024')).toBe(false); // Wrong separator
        expect(DVSAAutomation.isValidDate('32/01/2024')).toBe(false); // Invalid day
        expect(DVSAAutomation.isValidDate('29/02/2023')).toBe(false); // Not a leap year
        expect(DVSAAutomation.isValidDate('invalid')).toBe(false);
    });

    test('configure saves valid inputs', () => {
        GM_getValue.mockReturnValue('CURRENT_VAL');
        prompt
            .mockReturnValueOnce('ABCDE12345FGHIJ6') // Valid Licence
            .mockReturnValueOnce('15/08/2024') // Valid Date
            .mockReturnValueOnce('PS2 4PZ') // Postcode
            .mockReturnValueOnce('123456'); // Instructor

        // Spy on showToast
        const spyShowToast = jest.spyOn(DVSAAutomation, 'showToast');

        DVSAAutomation.configure();

        expect(GM_setValue).toHaveBeenCalledWith('drivingLicenceNumber', 'ABCDE12345FGHIJ6');
        expect(GM_setValue).toHaveBeenCalledWith('testDate', '15/08/2024');
        expect(GM_setValue).toHaveBeenCalledWith('postcode', 'PS2 4PZ');
        expect(GM_setValue).toHaveBeenCalledWith('instructorReferenceNumber', '123456');

        // Expect showToast to be called instead of alert
        expect(spyShowToast).toHaveBeenCalledWith(expect.stringContaining('Configuration saved'));
    });

    test('configure rejects invalid inputs', () => {
        GM_getValue.mockReturnValue('CURRENT_VAL');
        prompt.mockReset(); // Reset previous mocks
        prompt
             .mockReturnValueOnce('INVALID_LICENCE') // Licence
             .mockReturnValueOnce('INVALID_DATE')    // Date
             .mockReturnValueOnce('INVALID_POSTCODE') // Postcode
             .mockReturnValueOnce('INVALID_INSTRUCTOR'); // Instructor

        DVSAAutomation.configure();

        expect(GM_setValue).not.toHaveBeenCalledWith('drivingLicenceNumber', expect.anything());
        expect(alert).toHaveBeenCalledWith(expect.stringContaining('Invalid Licence Number'));

        expect(GM_setValue).not.toHaveBeenCalledWith('testDate', expect.anything());
        expect(alert).toHaveBeenCalledWith(expect.stringContaining('Invalid Date'));

        expect(GM_setValue).not.toHaveBeenCalledWith('postcode', expect.anything());
        expect(alert).toHaveBeenCalledWith(expect.stringContaining('Invalid Postcode'));

        expect(GM_setValue).not.toHaveBeenCalledWith('instructorReferenceNumber', expect.anything());
        expect(alert).toHaveBeenCalledWith(expect.stringContaining('Invalid Instructor Reference Number'));
    });

    test('configure saves valid inputs with empty instructor', () => {
        GM_getValue.mockReturnValue('CURRENT_VAL');
        prompt
            .mockReturnValueOnce('ABCDE12345FGHIJ6') // Valid Licence
            .mockReturnValueOnce('15/08/2024') // Valid Date
            .mockReturnValueOnce('PS2 4PZ') // Valid Postcode
            .mockReturnValueOnce(''); // Empty Instructor

        DVSAAutomation.configure();

        expect(GM_setValue).toHaveBeenCalledWith('instructorReferenceNumber', '');
    });

    test('configure handles cancelled prompts', () => {
        GM_getValue.mockReturnValue('CURRENT_VAL');
        prompt.mockReset();
        prompt.mockReturnValue(null); // All prompts cancelled

        DVSAAutomation.configure();

        expect(GM_setValue).not.toHaveBeenCalled();
    });

    test('configure trims whitespace from inputs', () => {
        GM_getValue.mockReturnValue('CURRENT_VAL');
        prompt.mockReset();
        prompt
            .mockReturnValueOnce('  ABCDE12345FGHIJ6  ') // Licence with spaces
            .mockReturnValueOnce('  15/08/2024  ')       // Date with spaces
            .mockReturnValueOnce('  PS2 4PZ  ')         // Postcode with spaces
            .mockReturnValueOnce('  123456  ');         // Instructor with spaces

        const spyShowToast = jest.spyOn(DVSAAutomation, 'showToast');

        DVSAAutomation.configure();

        expect(GM_setValue).toHaveBeenCalledWith('drivingLicenceNumber', 'ABCDE12345FGHIJ6');
        expect(GM_setValue).toHaveBeenCalledWith('testDate', '15/08/2024');
        expect(GM_setValue).toHaveBeenCalledWith('postcode', 'PS2 4PZ');
        expect(GM_setValue).toHaveBeenCalledWith('instructorReferenceNumber', '123456');

        expect(spyShowToast).toHaveBeenCalledWith(expect.stringContaining('Configuration saved'));
    });

    test('init calls handlePage on DOMContentLoaded when loading (optimization)', () => {
        global.document.readyState = 'loading';
        const spyHandlePage = jest.spyOn(DVSAAutomation, 'handlePage');

        DVSAAutomation.init();

        // Should listen for DOMContentLoaded
        expect(global.document.addEventListener).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));

        // Simulate DOMContentLoaded
        const domLoadedCallback = global.document.addEventListener.mock.calls.find(call => call[0] === 'DOMContentLoaded')[1];
        domLoadedCallback();

        expect(spyHandlePage).toHaveBeenCalled();
    });

    test('init calls handlePage immediately when readyState is complete', () => {
        global.document.readyState = 'complete';
        const spyHandlePage = jest.spyOn(DVSAAutomation, 'handlePage');

        DVSAAutomation.init();

        expect(spyHandlePage).toHaveBeenCalled();
        expect(global.document.addEventListener).not.toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));
    });

    describe('Configuration Loading', () => {
        beforeEach(() => {
            jest.resetModules();
            jest.clearAllMocks();
        });

        test('loads valid configuration from storage', () => {
            global.GM_getValue.mockImplementation((key) => {
                if (key === 'drivingLicenceNumber') return 'ABCDE12345FGHIJ6';
                if (key === 'testDate') return '01/01/2025';
                if (key === 'postcode') return 'SW1A 1AA';
                if (key === 'instructorReferenceNumber') return '123456';
                return null;
            });

            const DVSAAutomation = require('./main');
            expect(DVSAAutomation.drivingLicenceNumber).toBe('ABCDE12345FGHIJ6');
            expect(DVSAAutomation.testDate).toBe('01/01/2025');
            expect(DVSAAutomation.postcode).toBe('SW1A 1AA');
            expect(DVSAAutomation.instructorReferenceNumber).toBe('123456');
        });

        test('falls back to defaults for invalid configuration', () => {
            global.GM_getValue.mockImplementation((key) => {
                if (key === 'drivingLicenceNumber') return 'INVALID';
                if (key === 'testDate') return 'INVALID';
                if (key === 'postcode') return 'INVALID';
                if (key === 'instructorReferenceNumber') return 'INVALID';
                return null;
            });

            const spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

            const DVSAAutomation = require('./main');
            expect(DVSAAutomation.drivingLicenceNumber).toBe('Your_Driver_Licence_Here');
            expect(DVSAAutomation.testDate).toBe('15/08/2024');
            expect(DVSAAutomation.postcode).toBe('PS2 4PZ');
            expect(DVSAAutomation.instructorReferenceNumber).toBe('');

            expect(spyWarn).toHaveBeenCalledTimes(4); // One for each invalid field
        });
    });
});
