# DVSA Driving Test Booking Automation

We all know that feeling: trying to book a driving test slot on the DVSA website can be a hideous, soul-crushing experience. The endless refreshing, the constant unavailability of slots, the despair... I've been there. That's why I created this project! This script automates the entire process, sparing you from the torment of finding an available test slot. Sit back, relax, and let the automation handle the chaos for you.

If your exam type is "car" and you don't require special needs accommodations for the exam, this script is for you. Just follow the instructions in the "Usage" section of this README, and you'll be good to go.

## Features

- Automated navigation through the DVSA driving test booking site
- Filling in driving license details, test dates, and postcodes
- Searching for test centers and fetching more centers if needed
- Random delays between actions to avoid detection
- Toast notifications for visual feedback (coming soon)
- Alert sound for audio feedback (coming soon)

## Prerequisites

- Tampermonkey or any other userscript manager
- A modern web browser (Chrome, Firefox, Edge, etc.)
- Use a VPN (optional, but can help with anti bot detection)
- Use Incognito mode or guest mode when using the script (optional, but can help avoid bot detection)

## Installation

- Install the Tampermonkey extension for your browser.
- Click on the Tampermonkey extension icon in your browser and select "Create a new script".
- Copy and paste main.js to Tampermonkey
- Make sure you enabled it, and enjoy

## Usage

- Navigate to the DVSA driving test booking website.
- You need to manually click the green "Start now" button.
- On the first run, the script will prompt you to enter your details (Driving Licence, Test Date, etc.).
- You can also manually configure or update your details at any time via the Tampermonkey menu:
    1. Click the Tampermonkey icon in your browser.
    2. Find "DVSA Driving Test Booking Automation".
    3. Click on "Configure Script".
- The script will then automatically navigate through the booking process.
- Toast notifications will appear to indicate the progress of the automation.

## Customization

You no longer need to edit the script's source code to customize your details. Use the "Configure Script" option in the Tampermonkey menu to securely store your:
- Driving License Number
- Preferred Test Date
- Postcode
- Instructor Reference Number (if applicable)

These details are stored locally in your browser's Tampermonkey storage and are not exposed in the script's source code.

## Disclaimer

This script is not the ultimate solution, but it's the best I could create within a limited timeframe. It is designed to automate the booking process for a standard driving test and is not configured to accommodate special needs requirements, which involve additional configurations not covered here. Feel free to copy, modify, and configure the script to suit your specific needs.

Please note that this script is intended for educational purposes only. Use it responsibly and at your own risk.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
