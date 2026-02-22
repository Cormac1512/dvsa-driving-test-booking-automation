// ==UserScript==
// @name         DVSA Driving Test Booking Automation
// @namespace    http://tampermonkey.net/
// @version      2.6
// @description  Automate the driving test booking process and notify when a slot is available.
// @author       jethro-dev
// @match        https://driverpracticaltest.dvsa.gov.uk/application*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

const DVSAAutomation = (function () {
    'use strict';

    function getValue(key, defaultValue) {
        if (typeof GM_getValue !== 'undefined') {
            return GM_getValue(key, defaultValue);
        }
        return defaultValue;
    }

    function setValue(key, value) {
        if (typeof GM_setValue !== 'undefined') {
            GM_setValue(key, value);
        }
    }

    // Validation functions
    function isValidLicence(licence) {
        return /^[a-zA-Z0-9]{16}$/.test(licence);
    }

    function isValidPostcode(postcode) {
        return /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i.test(postcode);
    }

    function isValidInstructor(instructor) {
        return /^\d+$/.test(instructor);
    }

    function isValidDate(dateString) {
        const regex = /^\d{2}\/\d{2}\/\d{4}$/;
        if (!regex.test(dateString)) return false;
        const [day, month, year] = dateString.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
    }

    const DEFAULT_LICENCE = 'Your_Driver_Licence_Here';
    const DEFAULT_DATE = '15/08/2024';
    const DEFAULT_POSTCODE = 'PS2 4PZ';
    const DEFAULT_INSTRUCTOR = '';

    // Load and validate configuration
    let drivingLicenceNumber = getValue('drivingLicenceNumber', DEFAULT_LICENCE);
    if (!isValidLicence(drivingLicenceNumber)) {
        console.warn('Invalid driving licence number in storage. Using default.');
        drivingLicenceNumber = DEFAULT_LICENCE;
    }

    let testDate = getValue('testDate', DEFAULT_DATE);
    if (!isValidDate(testDate)) {
        console.warn('Invalid test date in storage. Using default.');
        testDate = DEFAULT_DATE;
    }

    let postcode = getValue('postcode', DEFAULT_POSTCODE);
    if (!isValidPostcode(postcode)) {
        console.warn('Invalid postcode in storage. Using default.');
        postcode = DEFAULT_POSTCODE;
    }

    let instructorReferenceNumber = getValue('instructorReferenceNumber', DEFAULT_INSTRUCTOR);
    if (instructorReferenceNumber !== '' && !isValidInstructor(instructorReferenceNumber)) {
        console.warn('Invalid instructor reference number in storage. Using default.');
        instructorReferenceNumber = DEFAULT_INSTRUCTOR;
    }

    const nearestNumOfCentres = 12; // Number of test centres to find
    const minDelay = 2000; // Minimum delay in milliseconds
    const maxDelay = 4000; // Maximum delay in milliseconds

    const app = {
        drivingLicenceNumber,
        testDate,
        postcode,
        instructorReferenceNumber,
        nearestNumOfCentres,
        minDelay,
        maxDelay,
        toastElement: null,
        toastTimeout: null,

        SELECTORS: {
            TEST_TYPE_CAR: '#test-type-car',
            DRIVING_LICENCE_INPUT: '#driving-licence',
            SPECIAL_NEEDS_NONE: '#special-needs-none',
            DRIVING_LICENCE_SUBMIT: '#driving-licence-submit',
            TEST_DATE_INPUT: '#test-choice-calendar',
            INSTRUCTOR_INPUT: '#instructor-prn',
            POSTCODE_INPUT: '#test-centres-input',
            POSTCODE_SUBMIT: '#test-centres-submit',
            TEST_CENTRE_RESULTS: '.test-centre-results',
            FETCH_MORE_CENTRES: '#fetch-more-centres'
        },

        isValidLicence,
        isValidPostcode,
        isValidInstructor,
        isValidDate,

        randomIntBetween(min, max) {
            if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
                const range = max - min + 1;
                const array = new Uint32Array(1);
                window.crypto.getRandomValues(array);
                return min + (array[0] % range);
            }
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },

        randomDelay(callback, ...args) {
            const delay = app.randomIntBetween(app.minDelay, app.maxDelay); // Random delay between minDelay and maxDelay
            setTimeout(callback, delay, ...args);
        },

        configure() {
            const currentLicence = getValue('drivingLicenceNumber', DEFAULT_LICENCE);
            let newLicence = prompt("Enter Driving Licence Number:", currentLicence);
            if (newLicence !== null) {
                newLicence = newLicence.trim();
                if (app.isValidLicence(newLicence)) {
                    setValue('drivingLicenceNumber', newLicence);
                } else {
                    alert("Invalid Licence Number! It should be 16 alphanumeric characters.");
                }
            }

            const currentDate = getValue('testDate', DEFAULT_DATE);
            let newDate = prompt("Enter Test Date (DD/MM/YYYY):", currentDate);
            if (newDate !== null) {
                newDate = newDate.trim();
                if (app.isValidDate(newDate)) {
                    setValue('testDate', newDate);
                } else {
                    alert("Invalid Date! Format should be DD/MM/YYYY.");
                }
            }

            const currentPostcode = getValue('postcode', DEFAULT_POSTCODE);
            let newPostcode = prompt("Enter Postcode:", currentPostcode);
            if (newPostcode !== null) {
                newPostcode = newPostcode.trim();
                if (app.isValidPostcode(newPostcode)) {
                    setValue('postcode', newPostcode);
                } else {
                    alert("Invalid Postcode! Format should be valid UK Postcode.");
                }
            }

            const currentInstructor = getValue('instructorReferenceNumber', DEFAULT_INSTRUCTOR);
            let newInstructor = prompt("Enter Instructor Reference Number (Optional):", currentInstructor);
            if (newInstructor !== null) {
                newInstructor = newInstructor.trim();
                if (newInstructor === '' || app.isValidInstructor(newInstructor)) {
                    setValue('instructorReferenceNumber', newInstructor);
                } else {
                    alert("Invalid Instructor Reference Number! It should be a numeric value.");
                }
            }

            app.showToast("Configuration saved. Please reload the page.");
        },

        showToast(message, duration = 3000) {
            if (!app.toastElement) {
                const toast = document.createElement('div');
                toast.id = 'dvsa-toast';
                toast.style.position = 'fixed';
                toast.style.bottom = '20px';
                toast.style.right = '20px';
                toast.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                toast.style.color = '#fff';
                toast.style.padding = '10px 20px';
                toast.style.borderRadius = '5px';
                toast.style.zIndex = '10000';
                toast.style.transition = 'opacity 0.5s ease-in-out';
                toast.style.opacity = '0';
                toast.style.fontFamily = 'Arial, sans-serif';
                toast.style.fontSize = '14px';
                toast.style.pointerEvents = 'none'; // Allow clicks through initially
                app.toastElement = toast;
            }

            const toast = app.toastElement;
            toast.textContent = message;

            if (!document.body.contains(toast)) {
                document.body.appendChild(toast);
            }

            // Clear any pending removal
            if (app.toastTimeout) {
                clearTimeout(app.toastTimeout);
                app.toastTimeout = null;
            }

            // Fade in
            requestAnimationFrame(() => {
                toast.style.opacity = '1';
            });

            // Schedule removal
            app.toastTimeout = setTimeout(() => {
                toast.style.opacity = '0';
                app.toastTimeout = setTimeout(() => {
                    if (document.body.contains(toast)) {
                        document.body.removeChild(toast);
                    }
                    app.toastTimeout = null;
                }, 500);
            }, duration);
        },


        scrollToElement(element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        },

        selectTestType(element) {
            console.log('Running selectTestType...');
            app.showToast('Selecting test type...');
            const testTypeCarBtn = element || document.querySelector(app.SELECTORS.TEST_TYPE_CAR);
            if (testTypeCarBtn) {
                testTypeCarBtn.click();
            }
        },

        enterLicenceDetails(element) {
            console.log('Running enterLicenceDetails...');
            app.showToast('Entering licence details...');
            const drivingLicenceInput = element || document.querySelector(app.SELECTORS.DRIVING_LICENCE_INPUT);
            if (drivingLicenceInput) {
                drivingLicenceInput.value = app.drivingLicenceNumber;
            }

            const specialNeedsNoneInput = document.querySelector(app.SELECTORS.SPECIAL_NEEDS_NONE);
            if (specialNeedsNoneInput) {
                specialNeedsNoneInput.checked = true;
            }

            const submitBtn = document.querySelector(app.SELECTORS.DRIVING_LICENCE_SUBMIT);
            if (submitBtn) {
                submitBtn.click();
            }
        },

        enterTestDate(element) {
            console.log('Running enterTestDate...');
            app.showToast('Entering test date...');
            const testDateInput = element || document.querySelector(app.SELECTORS.TEST_DATE_INPUT);
            if (testDateInput) {
                testDateInput.value = app.testDate;
            }

            if (app.instructorReferenceNumber !== null && app.instructorReferenceNumber !== '') {
                const instructorInput = document.querySelector(app.SELECTORS.INSTRUCTOR_INPUT);
                if (instructorInput) {
                    instructorInput.value = app.instructorReferenceNumber;
                }
            }

            const submitBtn = document.querySelector(app.SELECTORS.DRIVING_LICENCE_SUBMIT);
            if (submitBtn) {
                submitBtn.click();
            }
        },

        enterPostcode(element) {
            console.log('Running enterPostcode...');
            app.showToast('Entering postcode...');
            const postcodeInput = element || document.querySelector(app.SELECTORS.POSTCODE_INPUT);
            if (postcodeInput) {
                postcodeInput.value = app.postcode;
            }

            const submitBtn = document.querySelector(app.SELECTORS.POSTCODE_SUBMIT);
            if (submitBtn) {
                submitBtn.click();
            }
        },

        checkResults(element) {
            console.log('Running checkResults...');
            const results = element || document.querySelector(app.SELECTORS.TEST_CENTRE_RESULTS);

            if (results) {
                console.log('Checking number of test centers found...');
                app.showToast('Checking results...');
                if (results.children.length < app.nearestNumOfCentres) {
                    app.showToast('Fetching more centres...');
                    document.querySelector(app.SELECTORS.FETCH_MORE_CENTRES).click();
                }

                // Sleep and search again
                const interval = app.randomIntBetween(30000, 60000);
                console.log('Sleeping for ' + interval / 1000 + 's');
                app.showToast(`Waiting ${Math.round(interval / 1000)}s before next check...`, 5000);
                setTimeout(() => {
                    document.location.href = "https://driverpracticaltest.dvsa.gov.uk/application";
                }, interval);
            }
        },

        handlePage() {
            const routes = [
                {
                    name: 'Step 1: Test Type',
                    selector: app.SELECTORS.TEST_TYPE_CAR,
                    action: app.selectTestType
                },
                {
                    name: 'Step 2: Licence Details',
                    selector: app.SELECTORS.DRIVING_LICENCE_INPUT,
                    action: app.enterLicenceDetails
                },
                {
                    name: 'Step 3: Test Date',
                    selector: app.SELECTORS.TEST_DATE_INPUT,
                    action: app.enterTestDate
                },
                {
                    name: 'Step 5: Test Centre Results',
                    selector: app.SELECTORS.TEST_CENTRE_RESULTS,
                    action: app.checkResults
                },
                {
                    name: 'Step 4: Postcode Search',
                    selector: app.SELECTORS.POSTCODE_INPUT,
                    action: app.enterPostcode
                }
            ];

            for (const route of routes) {
                const element = document.querySelector(route.selector);
                if (element) {
                    console.log(`Matched route: ${route.name}`);
                    app.randomDelay(route.action, element);
                    return;
                }
            }

            console.log('No matching route found for current page.');
            console.log('Page Title:', document.title);
        },

        init() {
            // Ensure the script runs after the DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', app.handlePage);
            } else {
                app.handlePage();
            }
        }
    };

    if (typeof GM_registerMenuCommand !== 'undefined') {
        GM_registerMenuCommand("Configure Script", app.configure);
    }

    if (typeof module === 'undefined') {
        app.init();
    }

    return app;
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DVSAAutomation;
}
