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

    const DEFAULT_LICENCE = 'Your_Driver_Licence_Here';
    const DEFAULT_DATE = '15/08/2024';
    const DEFAULT_POSTCODE = 'PS2 4PZ';
    const DEFAULT_INSTRUCTOR = '';

    const drivingLicenceNumber = getValue('drivingLicenceNumber', DEFAULT_LICENCE); // Set to your driver licence
    const testDate = getValue('testDate', DEFAULT_DATE); // Set your desired test date, format in DD/MM/YYYY
    const postcode = getValue('postcode', DEFAULT_POSTCODE); // Set your postcode
    const instructorReferenceNumber = getValue('instructorReferenceNumber', DEFAULT_INSTRUCTOR); // Set to the instructor's reference number or leave as null if not applicable
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

        isValidLicence(licence) {
            return /^[a-zA-Z0-9]{16}$/.test(licence);
        },

        isValidPostcode(postcode) {
            return /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i.test(postcode);
        },

        isValidInstructor(instructor) {
            return /^\d+$/.test(instructor);
        },

        isValidDate(dateString) {
            const regex = /^\d{2}\/\d{2}\/\d{4}$/;
            if (!regex.test(dateString)) return false;
            const [day, month, year] = dateString.split('/').map(Number);
            const date = new Date(year, month - 1, day);
            return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
        },

        randomIntBetween(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },

        randomDelay(callback) {
            const delay = app.randomIntBetween(app.minDelay, app.maxDelay); // Random delay between minDelay and maxDelay
            setTimeout(callback, delay);
        },

        configure() {
            const currentLicence = getValue('drivingLicenceNumber', DEFAULT_LICENCE);
            const newLicence = prompt("Enter Driving Licence Number:", currentLicence);
            if (newLicence !== null) {
                if (app.isValidLicence(newLicence)) {
                    setValue('drivingLicenceNumber', newLicence);
                } else {
                    alert("Invalid Licence Number! It should be 16 alphanumeric characters.");
                }
            }

            const currentDate = getValue('testDate', DEFAULT_DATE);
            const newDate = prompt("Enter Test Date (DD/MM/YYYY):", currentDate);
            if (newDate !== null) {
                if (app.isValidDate(newDate)) {
                    setValue('testDate', newDate);
                } else {
                    alert("Invalid Date! Format should be DD/MM/YYYY.");
                }
            }

            const currentPostcode = getValue('postcode', DEFAULT_POSTCODE);
            const newPostcode = prompt("Enter Postcode:", currentPostcode);
            if (newPostcode !== null) {
                if (app.isValidPostcode(newPostcode)) {
                    setValue('postcode', newPostcode);
                } else {
                    alert("Invalid Postcode! Format should be valid UK Postcode.");
                }
            }

            const currentInstructor = getValue('instructorReferenceNumber', DEFAULT_INSTRUCTOR);
            const newInstructor = prompt("Enter Instructor Reference Number (Optional):", currentInstructor);
            if (newInstructor !== null) {
                if (newInstructor === '' || app.isValidInstructor(newInstructor)) {
                    setValue('instructorReferenceNumber', newInstructor);
                } else {
                    alert("Invalid Instructor Reference Number! It should be a numeric value.");
                }
            }

            app.showToast("Configuration saved. Please reload the page.");
        },

        showToast(message, duration = 3000) {
            const toast = document.createElement('div');
            toast.textContent = message;
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

            document.body.appendChild(toast);

            // Fade in
            requestAnimationFrame(() => {
                toast.style.opacity = '1';
            });

            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => {
                    if (document.body.contains(toast)) {
                        document.body.removeChild(toast);
                    }
                }, 500);
            }, duration);
        },


        scrollToElement(element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        },

        step1() {
            console.log('Running step 1...');
            app.showToast('Selecting test type...');
            const testTypeCarBtn = document.querySelector(app.SELECTORS.TEST_TYPE_CAR);
            if (testTypeCarBtn) {
                testTypeCarBtn.click();
            }
        },

        step2() {
            console.log('Running step 2...');
            app.showToast('Entering licence details...');
            const drivingLicenceInput = document.querySelector(app.SELECTORS.DRIVING_LICENCE_INPUT);
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

        step3() {
            console.log('Running step 3...');
            app.showToast('Entering test date...');
            const testDateInput = document.querySelector(app.SELECTORS.TEST_DATE_INPUT);
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

        step4() {
            console.log('Running step 4...');
            app.showToast('Entering postcode...');
            const postcodeInput = document.querySelector(app.SELECTORS.POSTCODE_INPUT);
            if (postcodeInput) {
                postcodeInput.value = app.postcode;
            }

            const submitBtn = document.querySelector(app.SELECTORS.POSTCODE_SUBMIT);
            if (submitBtn) {
                submitBtn.click();
            }
        },

        step5() {
            console.log('Running step 5...');
            const results = document.querySelector(app.SELECTORS.TEST_CENTRE_RESULTS);

            if (!results) {
                console.log('Entering postcode and searching for test centers...');
                app.showToast('Searching for test centres...');
                document.querySelector(app.SELECTORS.POSTCODE_INPUT).value = app.postcode;
                document.querySelector(app.SELECTORS.POSTCODE_SUBMIT).click();
            } else {
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
            switch (document.title) {
                case 'Type of test':
                    app.randomDelay(app.step1);
                    break;
                case 'Licence details':
                    app.randomDelay(app.step2);
                    break;
                case 'Test date':
                    app.randomDelay(app.step3);
                    break;
                case 'Test centre':
                    app.randomDelay(app.step4);
                    break;
                default:
                    console.log('Unknown page title:', document.title);
                    break;
            }
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
