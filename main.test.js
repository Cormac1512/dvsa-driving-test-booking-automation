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
    getElementById: jest.fn(function(id) {
        return this.querySelector('#' + id);
    }),
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
    warn: jest.fn(),
    error: jest.fn()
};
global.GM_setValue = jest.fn();
global.GM_getValue = jest.fn();
global.GM_registerMenuCommand = jest.fn();
global.prompt = jest.fn();
global.alert = jest.fn();
global.requestAnimationFrame = jest.fn((cb) => cb());

const DVSAAutomation = require('./main');

describe('DVSA Driving Test Booking Automation', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
        // Reset singleton state
        DVSAAutomation.routes = null;
        DVSAAutomation.toastElement = null;
        if (DVSAAutomation.toastTimeout) {
            clearTimeout(DVSAAutomation.toastTimeout);
            DVSAAutomation.toastTimeout = null;
        }
        DVSAAutomation.actionTimeout = null;
        DVSAAutomation.countdownInterval = null;
        // Reset mock default behavior
        document.body.contains.mockReturnValue(true);
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

    test('randomIntBetween handles inverted min/max', () => {
        const min = 5000;
        const max = 2000;
        const result = DVSAAutomation.randomIntBetween(min, max);
        expect(result).toBeGreaterThanOrEqual(max);
        expect(result).toBeLessThanOrEqual(min);
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

    test('randomIntBetween retries on bias rejection', () => {
        const min = 10;
        const max = 20;
        // Range is 11. 2^32 = 4294967296.
        // 4294967296 % 11 = 4.
        // limit = 4294967296 - 4 = 4294967292.
        // Values >= 4294967292 should be rejected.

        const mockGetRandomValues = jest.fn()
            .mockImplementationOnce((array) => {
                array[0] = 4294967295; // Should be rejected
                return array;
            })
            .mockImplementationOnce((array) => {
                array[0] = 12345; // Should be accepted
                return array;
            });

        global.window.crypto.getRandomValues = mockGetRandomValues;

        const result = DVSAAutomation.randomIntBetween(min, max);

        expect(mockGetRandomValues).toHaveBeenCalledTimes(2);
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

    test('randomDelay calls callback with arguments', () => {
        const callback = jest.fn();
        const arg1 = 'test';
        const arg2 = 123;
        DVSAAutomation.randomDelay(callback, arg1, arg2);
        jest.runAllTimers();
        expect(callback).toHaveBeenCalledWith(arg1, arg2);
    });

    test('randomDelay clears previous timeout', () => {
        const spyClearTimeout = jest.spyOn(global, 'clearTimeout');
        const callback1 = jest.fn();
        const callback2 = jest.fn();

        DVSAAutomation.randomDelay(callback1);
        const timeout1 = DVSAAutomation.actionTimeout;

        DVSAAutomation.randomDelay(callback2);

        expect(spyClearTimeout).toHaveBeenCalledWith(timeout1);
        expect(DVSAAutomation.actionTimeout).not.toBe(timeout1);
    });

    test('showToast creates and removes toast element', () => {
        // Mock contains to return false first (for append check), then true (for removal check)
        document.body.contains.mockReturnValueOnce(false).mockReturnValue(true);

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

        // Since we are inside nested setTimeout, we need to run pending timers again
        jest.runAllTimers();

        expect(document.body.removeChild).toHaveBeenCalledWith(toast);
    });

    test('showToast reuses existing toast element', () => {
        // Call 1: Should create and append
        document.body.contains.mockReturnValueOnce(false).mockReturnValue(true);
        DVSAAutomation.showToast('Msg 1', 1000);

        expect(document.createElement).toHaveBeenCalledTimes(1);
        const toast = DVSAAutomation.toastElement;
        expect(toast.textContent).toBe('Msg 1');

        // Call 2: Should reuse
        document.body.contains.mockReturnValue(true); // Already in DOM
        DVSAAutomation.showToast('Msg 2', 1000);

        expect(document.createElement).toHaveBeenCalledTimes(1); // Count remains 1
        expect(toast.textContent).toBe('Msg 2');
    });

    test('showToast prevents overlapping by clearing previous timeout', () => {
        document.body.contains.mockReturnValue(true);
        const spyClearTimeout = jest.spyOn(global, 'clearTimeout');

        DVSAAutomation.showToast('Msg 1', 1000);
        const timeout1 = DVSAAutomation.toastTimeout;

        DVSAAutomation.showToast('Msg 2', 1000);

        expect(spyClearTimeout).toHaveBeenCalledWith(timeout1);
        expect(DVSAAutomation.toastTimeout).not.toBe(timeout1);
    });

    test('showToast avoids redundant requestAnimationFrame calls when already visible', () => {
        document.body.contains.mockReturnValue(true);

        // First call: Should trigger animation
        DVSAAutomation.showToast('Msg 1', 1000);
        // Ensure it's fully visible
        DVSAAutomation.toastElement.style.opacity = '1';

        global.requestAnimationFrame.mockClear();

        // Second call: Should NOT trigger animation if already visible
        DVSAAutomation.showToast('Msg 2', 1000);

        expect(global.requestAnimationFrame).not.toHaveBeenCalled();
    });

    test('selectTestType clicks car test button if it exists', () => {
        const mockBtn = { click: jest.fn() };
        document.getElementById.mockReturnValueOnce(mockBtn);

        DVSAAutomation.selectTestType();

        expect(document.getElementById).toHaveBeenCalledWith(DVSAAutomation.SELECTORS.TEST_TYPE_CAR.id);
        expect(mockBtn.click).toHaveBeenCalled();
    });

    test('selectTestType clicks passed element without querySelector', () => {
        const mockBtn = { click: jest.fn() };
        DVSAAutomation.selectTestType(mockBtn);
        expect(document.querySelector).not.toHaveBeenCalled();
        expect(mockBtn.click).toHaveBeenCalled();
    });

    test('enterLicenceDetails fills licence and submits', () => {
        DVSAAutomation.drivingLicenceNumber = 'ABCDE12345FGHIJ6'; // Ensure valid licence
        const mockLicenceInput = { value: '' };
        const mockSpecialNeedsInput = { checked: false };
        const mockSubmitBtn = { click: jest.fn() };

        document.getElementById.mockImplementation((id) => {
            if (id === DVSAAutomation.SELECTORS.DRIVING_LICENCE_INPUT.id) return mockLicenceInput;
            if (id === DVSAAutomation.SELECTORS.SPECIAL_NEEDS_NONE.id) return mockSpecialNeedsInput;
            if (id === DVSAAutomation.SELECTORS.DRIVING_LICENCE_SUBMIT.id) return mockSubmitBtn;
            return null;
        });

        DVSAAutomation.enterLicenceDetails();

        expect(mockLicenceInput.value).toBe(DVSAAutomation.drivingLicenceNumber);
        expect(mockSpecialNeedsInput.checked).toBe(true);
        expect(mockSubmitBtn.click).toHaveBeenCalled();
    });

    test('enterLicenceDetails uses passed element without getElementById for input', () => {
        const mockLicenceInput = { value: '' };
        const mockSpecialNeedsInput = { checked: false };
        const mockSubmitBtn = { click: jest.fn() };

        document.getElementById.mockImplementation((id) => {
             // Only mock secondary elements, input should be passed
            if (id === DVSAAutomation.SELECTORS.SPECIAL_NEEDS_NONE.id) return mockSpecialNeedsInput;
            if (id === DVSAAutomation.SELECTORS.DRIVING_LICENCE_SUBMIT.id) return mockSubmitBtn;
            return null;
        });

        DVSAAutomation.enterLicenceDetails(mockLicenceInput);

        expect(document.getElementById).not.toHaveBeenCalledWith(DVSAAutomation.SELECTORS.DRIVING_LICENCE_INPUT.id);
        expect(mockLicenceInput.value).toBe(DVSAAutomation.drivingLicenceNumber);
    });

    test('enterLicenceDetails aborts if licence is invalid', () => {
        DVSAAutomation.drivingLicenceNumber = 'INVALID';
        const spyShowToast = jest.spyOn(DVSAAutomation, 'showToast');
        const mockSubmitBtn = { click: jest.fn() };

        document.getElementById.mockImplementation((id) => {
             if (id === DVSAAutomation.SELECTORS.DRIVING_LICENCE_SUBMIT.id) return mockSubmitBtn;
             return null;
        });

        DVSAAutomation.enterLicenceDetails();

        expect(spyShowToast).toHaveBeenCalledWith(expect.stringContaining('Invalid or default Driving Licence'));
        expect(mockSubmitBtn.click).not.toHaveBeenCalled();
    });

    test('enterLicenceDetails aborts if licence is default', () => {
        DVSAAutomation.drivingLicenceNumber = DVSAAutomation.DEFAULT_LICENCE;
        const spyShowToast = jest.spyOn(DVSAAutomation, 'showToast');
        const mockSubmitBtn = { click: jest.fn() };

        document.getElementById.mockImplementation((id) => {
             if (id === DVSAAutomation.SELECTORS.DRIVING_LICENCE_SUBMIT.id) return mockSubmitBtn;
             return null;
        });

        DVSAAutomation.enterLicenceDetails();

        expect(spyShowToast).toHaveBeenCalledWith(expect.stringContaining('Invalid or default Driving Licence'));
        expect(mockSubmitBtn.click).not.toHaveBeenCalled();
    });

    test('enterTestDate fills test date and submits', () => {
        DVSAAutomation.testDate = '01/01/2025';
        const mockDateInput = { value: '' };
        const mockInstructorInput = { value: '' };
        const mockSubmitBtn = { click: jest.fn() };

        document.getElementById.mockImplementation((id) => {
            if (id === DVSAAutomation.SELECTORS.TEST_DATE_INPUT.id) return mockDateInput;
            if (id === DVSAAutomation.SELECTORS.INSTRUCTOR_INPUT.id) return mockInstructorInput;
            if (id === DVSAAutomation.SELECTORS.DRIVING_LICENCE_SUBMIT.id) return mockSubmitBtn;
            return null;
        });

        DVSAAutomation.enterTestDate();

        expect(mockDateInput.value).toBe(DVSAAutomation.testDate);
        if (DVSAAutomation.instructorReferenceNumber !== '') {
            expect(mockInstructorInput.value).toBe(DVSAAutomation.instructorReferenceNumber);
        }
        expect(mockSubmitBtn.click).toHaveBeenCalled();
    });

    test('enterTestDate uses passed element without getElementById for input', () => {
        const mockDateInput = { value: '' };
        const mockInstructorInput = { value: '' };
        const mockSubmitBtn = { click: jest.fn() };

        document.getElementById.mockImplementation((id) => {
             // Only mock secondary elements
            if (id === DVSAAutomation.SELECTORS.INSTRUCTOR_INPUT.id) return mockInstructorInput;
            if (id === DVSAAutomation.SELECTORS.DRIVING_LICENCE_SUBMIT.id) return mockSubmitBtn;
            return null;
        });

        DVSAAutomation.enterTestDate(mockDateInput);

        expect(document.getElementById).not.toHaveBeenCalledWith(DVSAAutomation.SELECTORS.TEST_DATE_INPUT.id);
        expect(mockDateInput.value).toBe(DVSAAutomation.testDate);
    });

    test('enterTestDate aborts if test date is invalid', () => {
        DVSAAutomation.testDate = 'INVALID';
        const spyShowToast = jest.spyOn(DVSAAutomation, 'showToast');
        const mockSubmitBtn = { click: jest.fn() };

        document.getElementById.mockImplementation((id) => {
             if (id === DVSAAutomation.SELECTORS.DRIVING_LICENCE_SUBMIT.id) return mockSubmitBtn;
             return null;
        });

        DVSAAutomation.enterTestDate();

        expect(spyShowToast).toHaveBeenCalledWith(expect.stringContaining('Invalid or default Test Date'));
        expect(mockSubmitBtn.click).not.toHaveBeenCalled();
    });

    test('enterTestDate aborts if test date is default', () => {
        DVSAAutomation.testDate = DVSAAutomation.DEFAULT_DATE;
        const spyShowToast = jest.spyOn(DVSAAutomation, 'showToast');
        const mockSubmitBtn = { click: jest.fn() };

        document.getElementById.mockImplementation((id) => {
             if (id === DVSAAutomation.SELECTORS.DRIVING_LICENCE_SUBMIT.id) return mockSubmitBtn;
             return null;
        });

        DVSAAutomation.enterTestDate();

        expect(spyShowToast).toHaveBeenCalledWith(expect.stringContaining('Invalid or default Test Date'));
        expect(mockSubmitBtn.click).not.toHaveBeenCalled();
    });

    test('enterPostcode fills postcode and submits', () => {
        DVSAAutomation.postcode = 'SW1A 1AA';
        const mockPostcodeInput = { value: '' };
        const mockSubmitBtn = { click: jest.fn() };

        document.getElementById.mockImplementation((id) => {
            if (id === DVSAAutomation.SELECTORS.POSTCODE_INPUT.id) return mockPostcodeInput;
            if (id === DVSAAutomation.SELECTORS.POSTCODE_SUBMIT.id) return mockSubmitBtn;
            return null;
        });

        DVSAAutomation.enterPostcode();

        expect(mockPostcodeInput.value).toBe(DVSAAutomation.postcode);
        expect(mockSubmitBtn.click).toHaveBeenCalled();
    });

    test('enterPostcode aborts if postcode is invalid', () => {
        DVSAAutomation.postcode = 'INVALID';
        const spyShowToast = jest.spyOn(DVSAAutomation, 'showToast');
        const mockSubmitBtn = { click: jest.fn() };

        document.getElementById.mockImplementation((id) => {
             if (id === DVSAAutomation.SELECTORS.POSTCODE_SUBMIT.id) return mockSubmitBtn;
             return null;
        });

        DVSAAutomation.enterPostcode();

        expect(spyShowToast).toHaveBeenCalledWith(expect.stringContaining('Invalid or default Postcode'));
        expect(mockSubmitBtn.click).not.toHaveBeenCalled();
    });

    test('enterPostcode aborts if postcode is default', () => {
        DVSAAutomation.postcode = DVSAAutomation.DEFAULT_POSTCODE;
        const spyShowToast = jest.spyOn(DVSAAutomation, 'showToast');
        const mockSubmitBtn = { click: jest.fn() };

        document.getElementById.mockImplementation((id) => {
             if (id === DVSAAutomation.SELECTORS.POSTCODE_SUBMIT.id) return mockSubmitBtn;
             return null;
        });

        DVSAAutomation.enterPostcode();

        expect(spyShowToast).toHaveBeenCalledWith(expect.stringContaining('Invalid or default Postcode'));
        expect(mockSubmitBtn.click).not.toHaveBeenCalled();
    });

    test('enterPostcode uses passed element without getElementById for input', () => {
        DVSAAutomation.testDate = '01/01/2025';
        DVSAAutomation.postcode = 'SW1A 1AA';
        const mockPostcodeInput = { value: '' };
        const mockSubmitBtn = { click: jest.fn() };

        document.getElementById.mockImplementation((id) => {
             // Only mock secondary elements
            if (id === DVSAAutomation.SELECTORS.POSTCODE_SUBMIT.id) return mockSubmitBtn;
            return null;
        });

        DVSAAutomation.enterPostcode(mockPostcodeInput);

        expect(document.getElementById).not.toHaveBeenCalledWith(DVSAAutomation.SELECTORS.POSTCODE_INPUT.id);
        expect(mockPostcodeInput.value).toBe(DVSAAutomation.postcode);
    });

    test('checkResults handles results and clicks fetch more if needed', () => {
        const mockResults = { children: { length: 5 } };
        const mockFetchBtn = { click: jest.fn() };

        document.querySelector.mockImplementation((selector) => {
            if (selector === DVSAAutomation.SELECTORS.TEST_CENTRE_RESULTS.query) return mockResults;
            return null;
        });
        document.getElementById.mockImplementation((id) => {
            if (id === DVSAAutomation.SELECTORS.FETCH_MORE_CENTRES.id) return mockFetchBtn;
            return null;
        });

        DVSAAutomation.checkResults();
        expect(mockFetchBtn.click).toHaveBeenCalled();

        jest.runAllTimers();
        expect(document.location.href).toBe("https://driverpracticaltest.dvsa.gov.uk/application");
    });

    test('checkResults uses passed element without querySelector for results', () => {
        const mockResults = { children: { length: 5 } };
        const mockFetchBtn = { click: jest.fn() };

        document.getElementById.mockImplementation((id) => {
             // Only mock secondary elements
            if (id === DVSAAutomation.SELECTORS.FETCH_MORE_CENTRES.id) return mockFetchBtn;
            return null;
        });

        DVSAAutomation.checkResults(mockResults);

        expect(document.querySelector).not.toHaveBeenCalledWith(DVSAAutomation.SELECTORS.TEST_CENTRE_RESULTS.query);
        expect(mockFetchBtn.click).toHaveBeenCalled();
    });

    test('checkResults handles missing fetch more centres button gracefully', () => {
        const mockResults = { children: { length: 5 } };

        document.getElementById.mockImplementation((id) => {
             // Mock FETCH_MORE_CENTRES to return null
            if (id === DVSAAutomation.SELECTORS.FETCH_MORE_CENTRES.id) return null;
            return null;
        });

        // This should not throw an error
        expect(() => {
            DVSAAutomation.checkResults(mockResults);
        }).not.toThrow();
    });

    test('checkResults clears previous countdown interval', () => {
        const spyClearInterval = jest.spyOn(global, 'clearInterval');
        const mockResults = { children: { length: 15 } }; // Enough centres so no fetch more

        document.querySelector.mockImplementation((selector) => {
            if (selector === DVSAAutomation.SELECTORS.TEST_CENTRE_RESULTS.query) return mockResults;
            return null;
        });

        // First call sets interval
        DVSAAutomation.checkResults();
        const interval1 = DVSAAutomation.countdownInterval;

        // Second call should clear previous
        DVSAAutomation.checkResults();

        expect(spyClearInterval).toHaveBeenCalledWith(interval1);
        expect(DVSAAutomation.countdownInterval).not.toBe(interval1);
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
            const mockElement = { };
            document.getElementById.mockImplementation((id) => id === selector.id ? mockElement : null);
            document.querySelector.mockImplementation((query) => query === selector.query ? mockElement : null);

            DVSAAutomation.handlePage();

            // Verify randomDelay is called with step function AND the found element
            expect(spyRandomDelay).toHaveBeenCalledWith(step, mockElement);
            spyRandomDelay.mockClear();
        }
    });

    test('handlePage prioritizes checkResults over enterPostcode if results exist', () => {
        const spyRandomDelay = jest.spyOn(DVSAAutomation, 'randomDelay');
        const mockResults = {};
        const mockPostcode = {};

        document.querySelector.mockImplementation((selector) => {
            if (selector === DVSAAutomation.SELECTORS.TEST_CENTRE_RESULTS.query) return mockResults;
            return null;
        });
        document.getElementById.mockImplementation((id) => {
            if (id === DVSAAutomation.SELECTORS.POSTCODE_INPUT.id) return mockPostcode;
            return null;
        });

        DVSAAutomation.handlePage();

        expect(spyRandomDelay).toHaveBeenCalledWith(DVSAAutomation.checkResults, mockResults);
    });

    test('handlePage caches routes array', () => {
        DVSAAutomation.handlePage();
        const routes1 = DVSAAutomation.routes;
        expect(routes1).toBeDefined();
        expect(Array.isArray(routes1)).toBe(true);

        DVSAAutomation.handlePage();
        const routes2 = DVSAAutomation.routes;
        expect(routes2).toBe(routes1);
    });

    describe('countdown', () => {
        test('calls onTick immediately and then every second', () => {
            const onTick = jest.fn();
            const onComplete = jest.fn();
            const seconds = 3;

            DVSAAutomation.countdown(seconds, onTick, onComplete);

            expect(onTick).toHaveBeenCalledWith(3);
            expect(onTick).toHaveBeenCalledTimes(1);

            jest.advanceTimersByTime(1000);
            expect(onTick).toHaveBeenCalledWith(2);
            expect(onTick).toHaveBeenCalledTimes(2);

            jest.advanceTimersByTime(1000);
            expect(onTick).toHaveBeenCalledWith(1);
            expect(onTick).toHaveBeenCalledTimes(3);
        });

        test('calls onComplete when finished', () => {
            const onTick = jest.fn();
            const onComplete = jest.fn();
            const seconds = 2;

            DVSAAutomation.countdown(seconds, onTick, onComplete);

            jest.advanceTimersByTime(1000); // 1s elapsed, rem: 1
            jest.advanceTimersByTime(1000); // 2s elapsed, rem: 0 -> complete

            expect(onComplete).toHaveBeenCalled();
            expect(onTick).toHaveBeenCalledTimes(2); // 2 (initial), 1 (after 1s)
        });

        test('stops calling onTick after completion', () => {
            const onTick = jest.fn();
            const onComplete = jest.fn();
            const seconds = 1;

            DVSAAutomation.countdown(seconds, onTick, onComplete);

            jest.advanceTimersByTime(1000); // Finished
            expect(onComplete).toHaveBeenCalled();

            jest.advanceTimersByTime(1000); // Extra time
            expect(onTick).toHaveBeenCalledTimes(1); // Only initial call
        });

        test('clears existing actionTimeout on init', () => {
            const mockClearTimeout = jest.spyOn(global, 'clearTimeout');
            const timeoutId = setTimeout(jest.fn(), 1000);
            DVSAAutomation.actionTimeout = timeoutId;

            DVSAAutomation.countdown(5, jest.fn(), jest.fn());

            expect(mockClearTimeout).toHaveBeenCalledWith(timeoutId);
            expect(DVSAAutomation.actionTimeout).toBeNull();

            mockClearTimeout.mockRestore();
        });

        test('returns interval ID', () => {
            const id = DVSAAutomation.countdown(10, () => {}, () => {});
            expect(id).toBeDefined();
        });
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

    test('isValidDelay validates delay format and length', () => {
        expect(DVSAAutomation.isValidDelay(2000)).toBe(true);
        expect(DVSAAutomation.isValidDelay('2000')).toBe(true);
        expect(DVSAAutomation.isValidDelay(1000)).toBe(true);
        expect(DVSAAutomation.isValidDelay(999)).toBe(false);
        expect(DVSAAutomation.isValidDelay('abc')).toBe(false);
    });

    test('parseDelay parses delay format correctly', () => {
        expect(DVSAAutomation.parseDelay('2000')).toBe(2000);
        expect(DVSAAutomation.parseDelay(2000)).toBe(2000);
    });

    test('isValidInstructorOptional validates empty string or valid instructor format', () => {
        expect(DVSAAutomation.isValidInstructorOptional('')).toBe(true);
        expect(DVSAAutomation.isValidInstructorOptional('123456')).toBe(true);
        expect(DVSAAutomation.isValidInstructorOptional('abc')).toBe(false);
        expect(DVSAAutomation.isValidInstructorOptional('123a')).toBe(false);
    });

    test('updateSetting prompts, validates, and saves', () => {
        const key = 'testKey';
        const promptMsg = 'Enter Value:';
        const errorMsg = 'Invalid!';
        const validVal = 'valid';

        // Setup initial app state
        DVSAAutomation[key] = 'initial';

        prompt.mockReturnValueOnce(validVal);

        const validator = jest.fn().mockReturnValue(true);

        const result = DVSAAutomation.updateSetting(key, promptMsg, validator, errorMsg);

        expect(prompt).toHaveBeenCalledWith(promptMsg, 'initial');
        expect(validator).toHaveBeenCalledWith(validVal);
        expect(GM_setValue).toHaveBeenCalledWith(key, validVal);
        expect(DVSAAutomation[key]).toBe(validVal);
        expect(result).toBe(true);
    });

    test('updateSetting alerts on invalid input', () => {
        const key = 'testKey';
        DVSAAutomation[key] = 'initial';

        prompt.mockReturnValueOnce('invalid');
        const validator = jest.fn().mockReturnValue(false);

        const result = DVSAAutomation.updateSetting(key, 'msg', validator, 'Error!');

        expect(GM_setValue).not.toHaveBeenCalled();
        expect(alert).toHaveBeenCalledWith('Error!');
        expect(DVSAAutomation[key]).toBe('initial');
        expect(result).toBe(false);
    });

    test('updateSetting handles parsing', () => {
        const key = 'testNum';
        DVSAAutomation[key] = 10;

        prompt.mockReturnValueOnce('20');
        const validator = jest.fn().mockReturnValue(true);
        const parser = jest.fn().mockImplementation(val => parseInt(val, 10));

        DVSAAutomation.updateSetting(key, 'msg', validator, 'err', parser);

        expect(GM_setValue).toHaveBeenCalledWith(key, 20);
        expect(DVSAAutomation[key]).toBe(20);
    });

    test('configure saves valid inputs', () => {
        GM_getValue.mockReturnValue('CURRENT_VAL');
        prompt
            .mockReturnValueOnce('ABCDE12345FGHIJ6') // Valid Licence
            .mockReturnValueOnce('15/08/2024') // Valid Date
            .mockReturnValueOnce('PS2 4PZ') // Postcode
            .mockReturnValueOnce('123456') // Instructor
            .mockReturnValueOnce('2000') // Min Delay
            .mockReturnValueOnce('4000') // Max Delay
            .mockReturnValueOnce('30000') // Check Results Min Delay
            .mockReturnValueOnce('60000'); // Check Results Max Delay

        // Spy on showToast
        const spyShowToast = jest.spyOn(DVSAAutomation, 'showToast');

        DVSAAutomation.configure();

        expect(GM_setValue).toHaveBeenCalledWith('drivingLicenceNumber', 'ABCDE12345FGHIJ6');
        expect(GM_setValue).toHaveBeenCalledWith('testDate', '15/08/2024');
        expect(GM_setValue).toHaveBeenCalledWith('postcode', 'PS2 4PZ');
        expect(GM_setValue).toHaveBeenCalledWith('instructorReferenceNumber', '123456');
        expect(GM_setValue).toHaveBeenCalledWith('minDelay', 2000);
        expect(GM_setValue).toHaveBeenCalledWith('maxDelay', 4000);
        expect(GM_setValue).toHaveBeenCalledWith('checkResultsMinDelay', 30000);
        expect(GM_setValue).toHaveBeenCalledWith('checkResultsMaxDelay', 60000);

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
             .mockReturnValueOnce('INVALID_INSTRUCTOR') // Instructor
             .mockReturnValueOnce('500') // Min Delay (Too small)
             .mockReturnValueOnce('500') // Max Delay (Too small)
             .mockReturnValueOnce('500') // Check Results Min Delay (Too small)
             .mockReturnValueOnce('500'); // Check Results Max Delay (Too small)

        DVSAAutomation.configure();

        expect(GM_setValue).not.toHaveBeenCalledWith('drivingLicenceNumber', expect.anything());
        expect(alert).toHaveBeenCalledWith(expect.stringContaining('Invalid Licence Number'));

        expect(GM_setValue).not.toHaveBeenCalledWith('testDate', expect.anything());
        expect(alert).toHaveBeenCalledWith(expect.stringContaining('Invalid Date'));

        expect(GM_setValue).not.toHaveBeenCalledWith('postcode', expect.anything());
        expect(alert).toHaveBeenCalledWith(expect.stringContaining('Invalid Postcode'));

        expect(GM_setValue).not.toHaveBeenCalledWith('instructorReferenceNumber', expect.anything());
        expect(alert).toHaveBeenCalledWith(expect.stringContaining('Invalid Instructor Reference Number'));

        expect(GM_setValue).not.toHaveBeenCalledWith('minDelay', expect.anything());
        expect(alert).toHaveBeenCalledWith(expect.stringContaining('Invalid Delay! It should be at least 1000ms.'));

        expect(GM_setValue).not.toHaveBeenCalledWith('maxDelay', expect.anything());
        expect(alert).toHaveBeenCalledWith(expect.stringContaining('Invalid Delay! It should be at least 1000ms.'));

        expect(GM_setValue).not.toHaveBeenCalledWith('checkResultsMinDelay', expect.anything());
        expect(alert).toHaveBeenCalledWith(expect.stringContaining('Invalid Delay! It should be at least 1000ms.'));

        expect(GM_setValue).not.toHaveBeenCalledWith('checkResultsMaxDelay', expect.anything());
        expect(alert).toHaveBeenCalledWith(expect.stringContaining('Invalid Delay! It should be at least 1000ms.'));
    });

    test('configure saves valid inputs with empty instructor', () => {
        GM_getValue.mockReturnValue('CURRENT_VAL');
        prompt
            .mockReturnValueOnce('ABCDE12345FGHIJ6') // Valid Licence
            .mockReturnValueOnce('15/08/2024') // Valid Date
            .mockReturnValueOnce('PS2 4PZ') // Valid Postcode
            .mockReturnValueOnce('') // Empty Instructor
            .mockReturnValueOnce('2000') // Min Delay
            .mockReturnValueOnce('4000') // Max Delay
            .mockReturnValueOnce('30000') // Check Results Min Delay
            .mockReturnValueOnce('60000'); // Check Results Max Delay

        DVSAAutomation.configure();

        expect(GM_setValue).toHaveBeenCalledWith('instructorReferenceNumber', '');
        expect(GM_setValue).toHaveBeenCalledWith('minDelay', 2000);
        expect(GM_setValue).toHaveBeenCalledWith('maxDelay', 4000);
        expect(GM_setValue).toHaveBeenCalledWith('checkResultsMinDelay', 30000);
        expect(GM_setValue).toHaveBeenCalledWith('checkResultsMaxDelay', 60000);
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
            .mockReturnValueOnce('  123456  ')          // Instructor with spaces
            .mockReturnValueOnce('  2000  ')            // Min Delay
            .mockReturnValueOnce('  4000  ')            // Max Delay
            .mockReturnValueOnce('  30000  ')           // Check Results Min Delay
            .mockReturnValueOnce('  60000  ');          // Check Results Max Delay

        const spyShowToast = jest.spyOn(DVSAAutomation, 'showToast');

        DVSAAutomation.configure();

        expect(GM_setValue).toHaveBeenCalledWith('drivingLicenceNumber', 'ABCDE12345FGHIJ6');
        expect(GM_setValue).toHaveBeenCalledWith('testDate', '15/08/2024');
        expect(GM_setValue).toHaveBeenCalledWith('postcode', 'PS2 4PZ');
        expect(GM_setValue).toHaveBeenCalledWith('instructorReferenceNumber', '123456');
        expect(GM_setValue).toHaveBeenCalledWith('minDelay', 2000);
        expect(GM_setValue).toHaveBeenCalledWith('maxDelay', 4000);
        expect(GM_setValue).toHaveBeenCalledWith('checkResultsMinDelay', 30000);
        expect(GM_setValue).toHaveBeenCalledWith('checkResultsMaxDelay', 60000);

        expect(spyShowToast).toHaveBeenCalledWith(expect.stringContaining('Configuration saved'));
    });

    test('configure sanitizes licence and postcode to uppercase', () => {
        GM_getValue.mockReturnValue('CURRENT_VAL');
        prompt.mockReset();
        prompt
            .mockReturnValueOnce('abcde12345fghij6') // lowercase licence
            .mockReturnValueOnce('15/08/2024')
            .mockReturnValueOnce('sw1a 1aa')        // lowercase postcode
            .mockReturnValueOnce('123456')
            .mockReturnValueOnce('2000')
            .mockReturnValueOnce('4000')
            .mockReturnValueOnce('30000')
            .mockReturnValueOnce('60000');

        DVSAAutomation.configure();

        expect(GM_setValue).toHaveBeenCalledWith('drivingLicenceNumber', 'ABCDE12345FGHIJ6');
        expect(GM_setValue).toHaveBeenCalledWith('postcode', 'SW1A 1AA');
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

    test('togglePause toggles paused state and shows toast', () => {
        // Initial state: not paused (default)
        GM_getValue.mockReturnValue(false);
        const spyShowToast = jest.spyOn(DVSAAutomation, 'showToast');

        // Toggle to Pause
        DVSAAutomation.togglePause();

        expect(GM_getValue).toHaveBeenCalledWith('isPaused', false);
        expect(GM_setValue).toHaveBeenCalledWith('isPaused', true);
        expect(spyShowToast).toHaveBeenCalledWith('Automation Paused');

        // Toggle to Resume
        GM_getValue.mockReturnValue(true); // Now paused
        const spyHandlePage = jest.spyOn(DVSAAutomation, 'handlePage');

        DVSAAutomation.togglePause();

        expect(GM_setValue).toHaveBeenCalledWith('isPaused', false);
        expect(spyShowToast).toHaveBeenCalledWith('Automation Resumed');
        expect(spyHandlePage).toHaveBeenCalled();
    });

    test('togglePause clears actionTimeout when pausing', () => {
        GM_getValue.mockReturnValue(false); // Currently running
        const spyClearTimeout = jest.spyOn(global, 'clearTimeout');

        // Simulate active action
        DVSAAutomation.actionTimeout = 12345;

        DVSAAutomation.togglePause(); // Pause

        expect(spyClearTimeout).toHaveBeenCalledWith(12345);
    });

    test('togglePause clears countdownInterval when pausing', () => {
        GM_getValue.mockReturnValue(false); // Currently running
        const spyClearInterval = jest.spyOn(global, 'clearInterval');

        // Simulate active countdown
        DVSAAutomation.countdownInterval = 67890;

        DVSAAutomation.togglePause(); // Pause

        expect(spyClearInterval).toHaveBeenCalledWith(67890);
    });

    test('handlePage returns early if automation is paused', () => {
        GM_getValue.mockReturnValue(true); // Paused
        const spyShowToast = jest.spyOn(DVSAAutomation, 'showToast');
        const spyRandomDelay = jest.spyOn(DVSAAutomation, 'randomDelay');

        DVSAAutomation.handlePage();

        expect(spyShowToast).toHaveBeenCalledWith('Automation is paused');
        expect(spyRandomDelay).not.toHaveBeenCalled();
    });

    describe('Logger', () => {
        test('formats info messages with timestamp and prefix', () => {
            const spyLog = jest.spyOn(console, 'log');
            DVSAAutomation.Logger.info('Test Info');
            expect(spyLog).toHaveBeenCalledWith(expect.stringMatching(/\[.*\] \[DVSA Auto\] \[INFO\] Test Info/));
        });

        test('formats warn messages with timestamp and prefix', () => {
            const spyWarn = jest.spyOn(console, 'warn');
            DVSAAutomation.Logger.warn('Test Warn');
            expect(spyWarn).toHaveBeenCalledWith(expect.stringMatching(/\[.*\] \[DVSA Auto\] \[WARN\] Test Warn/));
        });

        test('formats error messages with timestamp and prefix', () => {
            const spyError = jest.spyOn(console, 'error');
            DVSAAutomation.Logger.error('Test Error');
            expect(spyError).toHaveBeenCalledWith(expect.stringMatching(/\[.*\] \[DVSA Auto\] \[ERROR\] Test Error/));
        });
    });

    describe('Configuration Loading', () => {
        beforeEach(() => {
            jest.resetModules();
            jest.clearAllMocks();
        });

        test('loadSetting loads value, validates, logs warning and falls back to default if invalid', () => {
            const spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

            global.GM_getValue.mockImplementation((key) => {
                if (key === 'validKey') return 'validValue';
                if (key === 'invalidKey') return 'invalidValue';
                return null;
            });

            const validateTrue = jest.fn(() => true);
            const validateFalse = jest.fn(() => false);
            const parseFn = jest.fn((val) => val.toUpperCase());

            const DVSAAutomation = require('./main');
            spyWarn.mockClear();

            const validResult = DVSAAutomation.loadSetting('validKey', 'defaultVal', validateTrue, 'Warning message', parseFn);
            expect(validResult).toBe('VALIDVALUE');
            expect(validateTrue).toHaveBeenCalledWith('validValue');
            expect(parseFn).toHaveBeenCalledWith('validValue');
            expect(spyWarn).not.toHaveBeenCalled();

            const invalidResult = DVSAAutomation.loadSetting('invalidKey', 'defaultVal', validateFalse, 'Warning message');
            expect(invalidResult).toBe('defaultVal');
            expect(validateFalse).toHaveBeenCalledWith('invalidValue');
            expect(spyWarn).toHaveBeenCalledWith(expect.stringMatching(/\[.*\] \[DVSA Auto\] \[WARN\] Warning message/));

            spyWarn.mockRestore();
        });

        test('loads valid configuration from storage', () => {
            global.GM_getValue.mockImplementation((key) => {
                if (key === 'drivingLicenceNumber') return 'ABCDE12345FGHIJ6';
                if (key === 'testDate') return '01/01/2025';
                if (key === 'postcode') return 'SW1A 1AA';
                if (key === 'instructorReferenceNumber') return '123456';
                if (key === 'minDelay') return 3000;
                if (key === 'maxDelay') return 5000;
                if (key === 'checkResultsMinDelay') return 20000;
                if (key === 'checkResultsMaxDelay') return 40000;
                return null;
            });

            const DVSAAutomation = require('./main');
            expect(DVSAAutomation.drivingLicenceNumber).toBe('ABCDE12345FGHIJ6');
            expect(DVSAAutomation.testDate).toBe('01/01/2025');
            expect(DVSAAutomation.postcode).toBe('SW1A 1AA');
            expect(DVSAAutomation.instructorReferenceNumber).toBe('123456');
            expect(DVSAAutomation.minDelay).toBe(3000);
            expect(DVSAAutomation.maxDelay).toBe(5000);
            expect(DVSAAutomation.checkResultsMinDelay).toBe(20000);
            expect(DVSAAutomation.checkResultsMaxDelay).toBe(40000);
        });

        test('falls back to defaults for invalid configuration', () => {
            global.GM_getValue.mockImplementation((key) => {
                if (key === 'drivingLicenceNumber') return 'INVALID';
                if (key === 'testDate') return 'INVALID';
                if (key === 'postcode') return 'INVALID';
                if (key === 'instructorReferenceNumber') return 'INVALID';
                if (key === 'minDelay') return 'INVALID';
                if (key === 'maxDelay') return 'INVALID';
                if (key === 'checkResultsMinDelay') return 'INVALID';
                if (key === 'checkResultsMaxDelay') return 'INVALID';
                return null;
            });

            const spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

            const DVSAAutomation = require('./main');
            expect(DVSAAutomation.drivingLicenceNumber).toBe('Your_Driver_Licence_Here');
            expect(DVSAAutomation.testDate).toBe('15/08/2024');
            expect(DVSAAutomation.postcode).toBe('PS2 4PZ');
            expect(DVSAAutomation.instructorReferenceNumber).toBe('');
            expect(DVSAAutomation.minDelay).toBe(2000);
            expect(DVSAAutomation.maxDelay).toBe(4000);
            expect(DVSAAutomation.checkResultsMinDelay).toBe(30000);
            expect(DVSAAutomation.checkResultsMaxDelay).toBe(60000);

            expect(spyWarn).toHaveBeenCalledTimes(8); // One for each invalid field
        });

        test('falls back to defaults for unsafe delays', () => {
            global.GM_getValue.mockImplementation((key) => {
                if (key === 'minDelay') return 500;
                if (key === 'maxDelay') return 500;
                if (key === 'checkResultsMinDelay') return 500;
                if (key === 'checkResultsMaxDelay') return 500;
                return null;
            });

            const spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

            const DVSAAutomation = require('./main');
            expect(DVSAAutomation.minDelay).toBe(2000);
            expect(DVSAAutomation.maxDelay).toBe(4000);
            expect(DVSAAutomation.checkResultsMinDelay).toBe(30000);
            expect(DVSAAutomation.checkResultsMaxDelay).toBe(60000);

            // Expect warns for minDelay, maxDelay, checkResultsMinDelay, checkResultsMaxDelay
            // plus warns for other invalid fields because mock returns null
            // For drivingLicenceNumber: null -> invalid -> warn
            // For testDate: null -> invalid -> warn
            // For postcode: null -> invalid -> warn
            // For instructor: null -> invalid -> warn
            // Total warns: 4 (others) + 4 (delays) = 8
            expect(spyWarn).toHaveBeenCalledTimes(8);
        });

        test('registers menu commands', () => {
            require('./main');
            expect(global.GM_registerMenuCommand).toHaveBeenCalledWith("Configure Script", expect.any(Function));
            expect(global.GM_registerMenuCommand).toHaveBeenCalledWith("Toggle Automation", expect.any(Function));
        });
    });
});
