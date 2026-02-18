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

    function configureScript() {
        const currentLicence = getValue('drivingLicenceNumber', DEFAULT_LICENCE);
        const newLicence = prompt("Enter Driving Licence Number:", currentLicence);
        if (newLicence !== null) setValue('drivingLicenceNumber', newLicence);

        const currentDate = getValue('testDate', DEFAULT_DATE);
        const newDate = prompt("Enter Test Date (DD/MM/YYYY):", currentDate);
        if (newDate !== null) setValue('testDate', newDate);

        const currentPostcode = getValue('postcode', DEFAULT_POSTCODE);
        const newPostcode = prompt("Enter Postcode:", currentPostcode);
        if (newPostcode !== null) setValue('postcode', newPostcode);

        const currentInstructor = getValue('instructorReferenceNumber', DEFAULT_INSTRUCTOR);
        const newInstructor = prompt("Enter Instructor Reference Number (Optional):", currentInstructor);
        if (newInstructor !== null) setValue('instructorReferenceNumber', newInstructor);

        alert("Configuration saved. Please reload the page for changes to take effect.");
    }

    const app = {
        drivingLicenceNumber,
        testDate,
        postcode,
        instructorReferenceNumber,
        nearestNumOfCentres,
        minDelay,
        maxDelay,

        randomIntBetween(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },

        randomDelay(callback) {
            const delay = app.randomIntBetween(app.minDelay, app.maxDelay); // Random delay between minDelay and maxDelay
            setTimeout(callback, delay);
        },

        showToast(message) {
            const toast = document.createElement('div');
            toast.className = 'toast';
            toast.textContent = message;
            document.body.appendChild(toast);

            setTimeout(() => {
                toast.classList.add('show');
            }, 10);
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => {
                    document.body.removeChild(toast);
                }, 300);
            }, 3000);
        },

        scrollToElement(element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        },

        step1() {
            console.log('Running step 1...');
            const testTypeCarBtn = document.querySelector('#test-type-car');
            if (testTypeCarBtn) {
                testTypeCarBtn.click();
            }
        },

        step2() {
            console.log('Running step 2...');
            const drivingLicenceInput = document.querySelector('#driving-licence');
            if (drivingLicenceInput) {
                drivingLicenceInput.value = app.drivingLicenceNumber;
            }

            const specialNeedsNoneInput = document.querySelector('#special-needs-none');
            if (specialNeedsNoneInput) {
                specialNeedsNoneInput.checked = true;
            }

            const submitBtn = document.querySelector('#driving-licence-submit');
            if (submitBtn) {
                submitBtn.click();
            }
        },

        step3() {
            console.log('Running step 3...');
            const testDateInput = document.querySelector('#test-choice-calendar');
            if (testDateInput) {
                testDateInput.value = app.testDate;
            }

            if (app.instructorReferenceNumber !== null && app.instructorReferenceNumber !== '') {
                const instructorInput = document.querySelector('#instructor-prn');
                if (instructorInput) {
                    instructorInput.value = app.instructorReferenceNumber;
                }
            }

            const submitBtn = document.querySelector('#driving-licence-submit');
            if (submitBtn) {
                submitBtn.click();
            }
        },

        step4() {
            console.log('Running step 4...');
            const postcodeInput = document.querySelector('#test-centres-input');
            if (postcodeInput) {
                postcodeInput.value = app.postcode;
            }

            const submitBtn = document.querySelector('#test-centres-submit');
            if (submitBtn) {
                submitBtn.click();
            }
        },

        step5() {
            console.log('Running step 5...');
            const results = document.querySelector('.test-centre-results');

            if (!results) {
                console.log('Entering postcode and searching for test centers...');
                document.querySelector('#test-centres-input').value = app.postcode;
                document.querySelector('#test-centres-submit').click();
            } else {
                console.log('Checking number of test centers found...');
                if (results.children.length < app.nearestNumOfCentres) {
                    document.querySelector('#fetch-more-centres').click();
                }

                // Sleep and search again
                const interval = app.randomIntBetween(30000, 60000);
                console.log('Sleeping for ' + interval / 1000 + 's');
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
            // Ensure the script runs after the page is fully loaded
            window.addEventListener('load', () => {
                app.randomDelay(app.handlePage);
            });
        }
    };

    (function createToastContainer() {
        const style = document.createElement('style');
        style.innerHTML = `
            .toast {
                visibility: hidden;
                min-width: 250px;
                margin-left: -125px;
                background-color: #333;
                color: #fff;
                text-align: center;
                border-radius: 2px;
                padding: 16px;
                position: fixed;
                z-index: 10000;
                left: 50%;
                bottom: 30px;
                font-size: 17px;
            }

            .toast.show {
                visibility: visible;
                -webkit-animation: fadein 0.5s, fadeout 0.5s 2.5s;
                animation: fadein 0.5s, fadeout 0.5s 2.5s;
            }

            @-webkit-keyframes fadein {
                from {bottom: 0; opacity: 0;}
                to {bottom: 30px; opacity: 1;}
            }

            @keyframes fadein {
                from {bottom: 0; opacity: 0;}
                to {bottom: 30px; opacity: 1;}
            }

            @-webkit-keyframes fadeout {
                from {bottom: 30px; opacity: 1;}
                to {bottom: 0; opacity: 0;}
            }

            @keyframes fadeout {
                from {bottom: 30px; opacity: 1;}
                to {bottom: 0; opacity: 0;}
            }
        `;
        document.head.appendChild(style);
    })();

    if (typeof GM_registerMenuCommand !== 'undefined') {
        GM_registerMenuCommand("Configure Script", configureScript);
    }

    if (typeof module === 'undefined') {
        app.init();
    }

    return app;
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DVSAAutomation;
}
