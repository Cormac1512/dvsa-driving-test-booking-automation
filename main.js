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

(function () {
    'use strict';

    const drivingLicenceNumber = GM_getValue('drivingLicenceNumber', '');
    const testDate = GM_getValue('testDate', '');
    const postcode = GM_getValue('postcode', '');
    const instructorReferenceNumber = GM_getValue('instructorReferenceNumber', '');
    const nearestNumOfCentres = 12; // Number of test centres to find
    const minDelay = 2000; // Minimum delay in milliseconds
    const maxDelay = 4000; // Maximum delay in milliseconds

    function setupConfig() {
        const dl = prompt('Enter your Driving Licence Number:', GM_getValue('drivingLicenceNumber', ''));
        if (dl !== null) GM_setValue('drivingLicenceNumber', dl.trim());

        const td = prompt('Enter desired test date (DD/MM/YYYY):', GM_getValue('testDate', ''));
        if (td !== null) GM_setValue('testDate', td.trim());

        const pc = prompt('Enter your Postcode:', GM_getValue('postcode', ''));
        if (pc !== null) GM_setValue('postcode', pc.trim());

        const irn = prompt('Enter Instructor Reference Number (optional):', GM_getValue('instructorReferenceNumber', ''));
        if (irn !== null) GM_setValue('instructorReferenceNumber', irn.trim());

        alert('Configuration saved! Please refresh the page to apply changes.');
    }

    GM_registerMenuCommand('Configure Script', setupConfig);

    function checkConfig() {
        if (!GM_getValue('drivingLicenceNumber') || !GM_getValue('testDate') || !GM_getValue('postcode')) {
            if (confirm('Configuration is missing or incomplete. Would you like to set it now?')) {
                setupConfig();
            }
            return false;
        }
        return true;
    }

    function randomIntBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function randomDelay(callback) {
        const delay = randomIntBetween(minDelay, maxDelay); // Random delay between minDelay and maxDelay
        setTimeout(callback, delay);
    }

    function showToast(message) {
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
    }

    function scrollToElement(element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function step1() {
        console.log('Running step 1...');
        const testTypeCarBtn = document.querySelector('#test-type-car');
        if (testTypeCarBtn) {
            testTypeCarBtn.click();
        }
    }

    function step2() {
        console.log('Running step 2...');
        const drivingLicenceInput = document.querySelector('#driving-licence');
        if (drivingLicenceInput) {
            drivingLicenceInput.value = drivingLicenceNumber;
        }

        const specialNeedsNoneInput = document.querySelector('#special-needs-none');
        if (specialNeedsNoneInput) {
            specialNeedsNoneInput.checked = true;
        }

        const submitBtn = document.querySelector('#driving-licence-submit');
        if (submitBtn) {
            submitBtn.click();
        }
    }

    function step3() {
        console.log('Running step 3...');
        const testDateInput = document.querySelector('#test-choice-calendar');
        if (testDateInput) {
            testDateInput.value = testDate;
        }

        if (instructorReferenceNumber !== null) {
            const instructorInput = document.querySelector('#instructor-prn');
            if (instructorInput) {
                instructorInput.value = instructorReferenceNumber;
            }
        }

        const submitBtn = document.querySelector('#driving-licence-submit');
        if (submitBtn) {
            submitBtn.click();
        }
    }

    function step4() {
        console.log('Running step 4...');
        const postcodeInput = document.querySelector('#test-centres-input');
        if (postcodeInput) {
            postcodeInput.value = postcode;
        }

        const submitBtn = document.querySelector('#test-centres-submit');
        if (submitBtn) {
            submitBtn.click();
        }
    }

    function step5() {
        console.log('Running step 5...');
        const results = document.querySelector('.test-centre-results');

        if (!results) {
            console.log('Entering postcode and searching for test centers...');
            document.querySelector('#test-centres-input').value = postcode;
            document.querySelector('#test-centres-submit').click();
        } else {
            console.log('Checking number of test centers found...');
            if (results.children.length < nearestNumOfCentres) {
                document.querySelector('#fetch-more-centres').click();
            }

            // Sleep and search again
            const interval = randomIntBetween(30000, 60000);
            console.log('Sleeping for ' + interval / 1000 + 's');
            setTimeout(() => {
                document.location.href = "https://driverpracticaltest.dvsa.gov.uk/application";
            }, interval);
        }
    }

    function handlePage() {
        switch (document.title) {
            case 'Type of test':
                randomDelay(step1);
                break;
            case 'Licence details':
                randomDelay(step2);
                break;
            case 'Test date':
                randomDelay(step3);
                break;
            case 'Test centre':
                randomDelay(step4);
                break;
            default:
                console.log('Unknown page title:', document.title);
                break;
        }
    }

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

    // Ensure the script runs after the page is fully loaded
    window.addEventListener('load', () => {
        if (checkConfig()) {
            randomDelay(handlePage);
        }
    });
})();
