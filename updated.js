// ==UserScript==
// @name         Test
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Appends a button to the page and logs the fetch request response, with a popup for JSON data display and caching
// @author       You
// @match        *://student.ostedhy.com/subjects/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Cache object to store fetched data
    const dataCache = {};

    // Function to create and show the popup
    function showPopup(data) {
        // Create the popup container
        const popup = document.createElement('div');
        popup.style.position = 'fixed';
        popup.style.top = '50%';
        popup.style.left = '50%';
        popup.style.transform = 'translate(-50%, -50%)';
        popup.style.backgroundColor = 'white';
        popup.style.border = '1px solid #ccc';
        popup.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)'; // Add a subtle shadow
        popup.style.padding = '20px';
        popup.style.zIndex = '1000';
        popup.style.maxHeight = '80%';
        popup.style.overflowY = 'auto';
        popup.style.borderRadius = '10px'; // Rounded corners

        // Create a close button
        const closeButton = document.createElement('button');
        closeButton.innerText = 'Close';
        closeButton.style.marginBottom = '10px';
        closeButton.style.background = '#30c1d9'; // Match button color
        closeButton.style.color = 'white'; // Button text color
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '5px';
        closeButton.style.padding = '5px 10px';
        closeButton.style.cursor = 'pointer';

        closeButton.onclick = () => {
            document.body.removeChild(popup); // Remove the popup when closed
        };

        popup.appendChild(closeButton);

        // Populate the popup with the fetched data
        data.forEach(section => {
            const sectionElement = document.createElement('div');
            sectionElement.style.marginBottom = '20px';

            const sectionTitle = document.createElement('h3');
            sectionTitle.innerText = section.sectionName;
            sectionTitle.style.color = 'black'; // Section title color
            sectionElement.appendChild(sectionTitle);

            section.lessons.forEach(lesson => {
                const lessonElement = document.createElement('div');
                lessonElement.style.marginBottom = '5px';
                lessonElement.style.color = 'black'; // Lesson text color

                const lessonName = document.createElement('span');
                lessonName.innerText = lesson.lessonName;

                // Check if attachment is a valid Amazon S3 link
                let isValidAttachment = lesson.attachment && lesson.attachment.includes('amazonaws.com');

                // Create "Open" button for attachments
                const openButton = document.createElement('button');
                openButton.style.marginLeft = '10px';
                openButton.style.background = '#30c1d9'; // Match button color
                openButton.style.color = 'white'; // Button text color
                openButton.style.border = 'none';
                openButton.style.borderRadius = '5px';
                openButton.style.padding = '2px 6px';
                openButton.style.cursor = 'pointer';

                if (isValidAttachment) {
                    openButton.innerText = 'Open'; // Button text for valid attachments
                    openButton.onclick = () => {
                        window.open(lesson.attachment, '_blank'); // Open the attachment in a new tab
                    };
                } else {
                    openButton.innerText = 'Not Found'; // Button text for invalid attachments
                    openButton.disabled = true; // Disable the button
                    openButton.style.background = '#ccc'; // Change color for "not found"
                }

                lessonElement.appendChild(lessonName);
                lessonElement.appendChild(openButton);
                sectionElement.appendChild(lessonElement);
            });

            popup.appendChild(sectionElement);
        });

        document.body.appendChild(popup); // Append the popup to the body
    }

    // Function to check for the presence of the subjects element
    function checkForSubjects() {
        const subjectsElement = document.querySelector(".subjects");
        if (subjectsElement) {
            const cardElements = document.querySelectorAll(".card"); // Change selector to ".card"

            // Loop through each card element
            cardElements.forEach(card => {
                const anchor = card.querySelector("a");
                if (anchor) {
                    const hrefValue = anchor.getAttribute('href');
                    const id = hrefValue.split('/').pop(); // Get the last segment (e.g., "157")

                    // Create a new div element to hold the button
                    const buttonContainer = document.createElement("div");
                    buttonContainer.style.padding = '10px'; // Add padding to the div
                    buttonContainer.style.textAlign = 'center'; // Center the button within the div

                    // Create a new button element
                    const button = document.createElement("button");
                    button.innerText = 'Download'; // Button text
                    button.id = `${id}`; // Set a unique ID for the button

                    // Apply styles to the button
                    button.style.width = '100%';
                    button.style.height = '42px'; // Set the height
                    button.style.border = 'none';
                    button.style.color = '#fff';
                    button.style.fontSize = '18px';
                    button.style.fontWeight = '500';
                    button.style.background = '#30c1d9';
                    button.style.borderRadius = '13px';
                    button.style.cursor = 'pointer'; // Changes cursor to pointer on hover

                    // Add hover effect to the button
                    button.style.transition = 'background-color 0.3s ease'; // Smooth transition for background color
                    button.addEventListener('mouseover', () => {
                        button.style.backgroundColor = '#308d9c'; // Change background color on hover
                    });
                    button.addEventListener('mouseout', () => {
                        button.style.backgroundColor = '#30c1d9'; // Revert to original color when not hovering
                    });

                    // Add an event listener to the button for fetching data
                    button.addEventListener('click', function() {
                        // Check if the data is already cached
                        if (dataCache[id]) {
                            console.log("Using cached data for id:", id);
                            showPopup(dataCache[id]); // Use cached data if available
                            return;
                        }

                        const token = localStorage.getItem('token');
                        const apiLink = `https://api.ostedhy.com/api/chapters/student/${id}`; // Use button ID in the API link

                        // Send the fetch request when the button is clicked
                        fetch(apiLink, {
                            method: 'GET',
                            headers: {
                                'Accept': 'application/json',
                                'Authorization': `Bearer ${token}`,
                                'Cache-Control': 'no-cache' // Keep this header
                            }
                        })
                        .then(response => {
                            console.log("Request sent, waiting for response...");

                            // Check if the response is ok (status in the range 200-299)
                            if (!response.ok) {
                                throw new Error(`HTTP error! status: ${response.status}`);
                            }
                            return response.json(); // Convert response to JSON
                        })
                        .then(data => {
                            const organizedData = [];

                            // Organize the fetched data
                            data.payload.sections.forEach(sectionData => {
                                const section = {
                                    sectionName: sectionData.name,
                                    lessons: sectionData.lessons.map((lessonData, index) => {
                                        // Check if attachments exist and are valid Amazon S3 links
                                        const attachment = lessonData.attachments?.find(att =>
                                            att.file_name && // Ensure file_name exists
                                            att.file_name.includes('amazonaws.com') // Check for Amazon S3 link
                                        )?.file_name || null; // Keep Amazon S3 attachments only

                                        return {
                                            lessonName: `${index + 1}- ${lessonData.name}`,
                                            attachment: attachment
                                        };
                                    }),
                                };
                                organizedData.push(section);
                            });

                            // Cache the data for future use
                            dataCache[id] = organizedData;
                            console.log("Data cached for id:", id);

                            // Show the organized data in a popup
                            showPopup(organizedData);
                        })
                        .catch(error => console.error('Error:', error));
                    });

                    // Append the button to the button container
                    buttonContainer.appendChild(button); // Append button to the div
                    // Append the button container to the card
                    card.appendChild(buttonContainer); // Append the div to the card
                }
            });
            clearInterval(interval);
        }
    }

    // Poll for the subjects element every 500 milliseconds
    const interval = setInterval(checkForSubjects, 500);
})();
