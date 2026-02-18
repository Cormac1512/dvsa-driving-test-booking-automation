// Minimal DOM mock for Node environment
global.document = {
    head: { appendChild: jest.fn() },
    body: {
        appendChild: jest.fn(),
        removeChild: jest.fn()
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
    location: { href: '' }
};
global.window = {
    addEventListener: jest.fn(),
    location: { href: '' }
};
global.console = {
    log: jest.fn()
};

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

    test('randomDelay calls callback after timeout', () => {
        const callback = jest.fn();
        const spySetTimeout = jest.spyOn(global, 'setTimeout');
        DVSAAutomation.randomDelay(callback);
        expect(spySetTimeout).toHaveBeenCalled();
        jest.runAllTimers();
        expect(callback).toHaveBeenCalled();
    });

    test('step1 clicks car test button if it exists', () => {
        const mockBtn = { click: jest.fn() };
        document.querySelector.mockReturnValueOnce(mockBtn);

        DVSAAutomation.step1();

        expect(document.querySelector).toHaveBeenCalledWith('#test-type-car');
        expect(mockBtn.click).toHaveBeenCalled();
    });

    test('step2 fills licence and submits', () => {
        const mockLicenceInput = { value: '' };
        const mockSpecialNeedsInput = { checked: false };
        const mockSubmitBtn = { click: jest.fn() };

        document.querySelector.mockImplementation((selector) => {
            if (selector === '#driving-licence') return mockLicenceInput;
            if (selector === '#special-needs-none') return mockSpecialNeedsInput;
            if (selector === '#driving-licence-submit') return mockSubmitBtn;
            return null;
        });

        DVSAAutomation.step2();

        expect(mockLicenceInput.value).toBe(DVSAAutomation.drivingLicenceNumber);
        expect(mockSpecialNeedsInput.checked).toBe(true);
        expect(mockSubmitBtn.click).toHaveBeenCalled();
    });

    test('step3 fills test date and submits', () => {
        const mockDateInput = { value: '' };
        const mockInstructorInput = { value: '' };
        const mockSubmitBtn = { click: jest.fn() };

        document.querySelector.mockImplementation((selector) => {
            if (selector === '#test-choice-calendar') return mockDateInput;
            if (selector === '#instructor-prn') return mockInstructorInput;
            if (selector === '#driving-licence-submit') return mockSubmitBtn;
            return null;
        });

        DVSAAutomation.step3();

        expect(mockDateInput.value).toBe(DVSAAutomation.testDate);
        if (DVSAAutomation.instructorReferenceNumber !== '') {
            expect(mockInstructorInput.value).toBe(DVSAAutomation.instructorReferenceNumber);
        }
        expect(mockSubmitBtn.click).toHaveBeenCalled();
    });

    test('step4 fills postcode and submits', () => {
        const mockPostcodeInput = { value: '' };
        const mockSubmitBtn = { click: jest.fn() };

        document.querySelector.mockImplementation((selector) => {
            if (selector === '#test-centres-input') return mockPostcodeInput;
            if (selector === '#test-centres-submit') return mockSubmitBtn;
            return null;
        });

        DVSAAutomation.step4();

        expect(mockPostcodeInput.value).toBe(DVSAAutomation.postcode);
        expect(mockSubmitBtn.click).toHaveBeenCalled();
    });

    test('step5 handles results and clicks fetch more if needed', () => {
        const mockResults = { children: { length: 5 } };
        const mockFetchBtn = { click: jest.fn() };

        document.querySelector.mockImplementation((selector) => {
            if (selector === '.test-centre-results') return mockResults;
            if (selector === '#fetch-more-centres') return mockFetchBtn;
            return null;
        });

        DVSAAutomation.step5();
        expect(mockFetchBtn.click).toHaveBeenCalled();

        jest.runAllTimers();
        expect(document.location.href).toBe("https://driverpracticaltest.dvsa.gov.uk/application");
    });

    test('handlePage routes correctly based on document title', () => {
        const spyRandomDelay = jest.spyOn(DVSAAutomation, 'randomDelay');

        const testCases = [
            { title: 'Type of test', step: DVSAAutomation.step1 },
            { title: 'Licence details', step: DVSAAutomation.step2 },
            { title: 'Test date', step: DVSAAutomation.step3 },
            { title: 'Test centre', step: DVSAAutomation.step4 }
        ];

        for (const { title, step } of testCases) {
            document.title = title;
            DVSAAutomation.handlePage();
            expect(spyRandomDelay).toHaveBeenCalledWith(step);
            spyRandomDelay.mockClear();
        }
    });

    test('showToast creates and removes element and injects styles once', () => {
        const mockStyle = { innerHTML: '' };
        const mockToast = {
            textContent: '',
            classList: { add: jest.fn(), remove: jest.fn() }
        };

        // Reset injection flag
        DVSAAutomation._toastStylesInjected = false;

        // Mock return values: first for style, second for div
        document.createElement
            .mockReturnValueOnce(mockStyle)
            .mockReturnValueOnce(mockToast);

        DVSAAutomation.showToast('Test Message');

        // Check style injection
        expect(document.createElement).toHaveBeenCalledWith('style');
        expect(document.head.appendChild).toHaveBeenCalledWith(mockStyle);
        expect(mockStyle.innerHTML).toContain('.toast');
        expect(DVSAAutomation._toastStylesInjected).toBe(true);

        // Check toast creation
        expect(document.createElement).toHaveBeenCalledWith('div');
        expect(mockToast.textContent).toBe('Test Message');
        expect(document.body.appendChild).toHaveBeenCalledWith(mockToast);

        jest.advanceTimersByTime(10);
        expect(mockToast.classList.add).toHaveBeenCalledWith('show');

        jest.advanceTimersByTime(3000);
        expect(mockToast.classList.remove).toHaveBeenCalledWith('show');

        jest.advanceTimersByTime(300);
        expect(document.body.removeChild).toHaveBeenCalledWith(mockToast);

        // Test that second call does not inject styles again
        const mockToast2 = {
             textContent: '',
             classList: { add: jest.fn(), remove: jest.fn() }
        };
        document.createElement.mockReturnValueOnce(mockToast2); // Prepare mock for next toast

        DVSAAutomation.showToast('Another Message');

        // Should have called createElement 3 times total: style, div1, div2
        expect(document.createElement).toHaveBeenCalledTimes(3);
        // Should have appended child to head only once
        expect(document.head.appendChild).toHaveBeenCalledTimes(1);
    });
});
