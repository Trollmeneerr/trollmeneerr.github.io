function copyToClipboard() {
    var copyText = document.getElementById("copyText").innerHTML;
    navigator.clipboard.writeText(copyText)
        .then(() => {
            alert("Path copied to clipboard successfully!");
        })
        .catch(err => {
            console.error('Failed to copy: ', err);
            alert("Failed to copy Path to clipboard.");
        });
}

document.addEventListener('DOMContentLoaded', () => {

    const MapID = {
        SunnyMeadowsRestricted: 0,
        SunnyMeadows: 1,
        BleasdaleFarmhouse: 2,
        CampWoodWind: 3,
        MapleLodgeCampsite: 4,
        EdgefieldStreetHouse: 5,
        GraftonFarmhouse: 6,
        Prison: 7,
        Tutorial: 8,
        RidgeviewStreetHouse: 9,
        Highschool: 10,
        TanglewoodStreetHouse: 11,
        WillowStreetHouse: 12,
        Asylum: 13,
        PointHope: 14
    };

    async function decryptData(encryptedData, password) {
        // Extract the IV from the first 16 bytes and the rest of the data
        const iv = encryptedData.subarray(0, 16);
        const key = await window.crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(password), { name: "PBKDF2" },
            false, ["deriveKey"]
        );
        const derivedKey = await window.crypto.subtle.deriveKey({
                name: "PBKDF2",
                salt: iv,
                iterations: 100,
                hash: "SHA-1"
            },
            key, { name: "AES-CBC", length: 128 },
            false, ["decrypt"]
        );

        const decryptedData = await window.crypto.subtle.decrypt({ name: "AES-CBC", iv: iv },
            derivedKey,
            encryptedData.subarray(16)
        );

        return new Uint8Array(decryptedData);
    }

    function toString(data) {
        const decoder = new TextDecoder("utf-8");
        const str = decoder.decode(data);
        return str.slice(0, str.lastIndexOf("}") + 1).trim(); // Ensure it ends properly
    }

    function fixString(data) {
        let trimmed = data.trim().replace(/\r/g, "").replace(/\n/g, "").replace(/\t/g, "");
        console.log("Trimmed Data:", trimmed); // Log for debugging

        const playedMapsIndex = trimmed.indexOf("playedMaps");
        if (playedMapsIndex === -1) throw new Error("playedMaps not found");

        const valueIndex = trimmed.indexOf("value", playedMapsIndex);
        if (valueIndex === -1) throw new Error("value not found");

        const openBracketIndex = trimmed.indexOf("{", valueIndex);
        if (openBracketIndex === -1) throw new Error("Opening bracket not found for playedMaps");

        const closeBracketIndex = trimmed.indexOf("}", openBracketIndex);
        if (closeBracketIndex === -1) throw new Error("Closing bracket not found for playedMaps");

        const firstChunk = trimmed.slice(0, openBracketIndex);
        const badChunk = trimmed.slice(openBracketIndex, closeBracketIndex + 1);
        const lastChunk = trimmed.slice(closeBracketIndex + 1);

        // Ensure the keys in badChunk are wrapped in quotes
        const fixedChunk = badChunk.replace(/(\d+)/g, '"$1"'); // Wrap numbers (map IDs) in quotes

        return firstChunk + fixedChunk + lastChunk;
    }

    function fromJson(data) {
        try {
            const jsonData = JSON.parse(fixString(data));
            console.log("Parsed JSON Data:", jsonData); // Log the parsed JSON
            return Object.entries(jsonData).sort().reduce((obj, [key, value]) => {
                obj[key] = value;
                return obj;
            }, {});
        } catch (e) {
            throw new Error(`Failed to parse JSON: ${e.message}`);
        }
    }

    function fixMapping(mapping) {
        const playedMaps = mapping.playedMaps.value;

        const playedMapsFixed = {};
        for (const [k, v] of Object.entries(playedMaps)) {
            playedMapsFixed[Object.keys(MapID).find(key => MapID[key] === parseInt(k.trim().replace(/"/g, '')))] = parseInt(v.trim().replace(/"/g, ''));
        }

        mapping.playedMaps.value = playedMapsFixed;

        return mapping;
    }

    function showLoading() {
        // Show loading screen and hide other content
        document.getElementById('loadingOverlay').style.display = 'flex';
        // Simulate a loading process (like an API call or data processing)
        setTimeout(function() {
            hideLoading();
        }, 3000); // Example: hide loading after 3 seconds
    }
    
    function hideLoading() {
        // Hide loading screen and show the actual content
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    // Handling the file input and decryption
    document.getElementById('processDataBtn').addEventListener('click', async() => {
        const fileInput = document.getElementById('jsonFileInput');
        const password = 't36gref9u84y7f43g'; // Replace this with the actual password
        


        if (!fileInput.files.length) {
            alert('Please select a file.');
            return;
        }
        const file = fileInput.files[0];
        const reader = new FileReader();
        // add delay 3s
        reader.onload = async(event) => {
            const encryptedData = new Uint8Array(event.target.result); // Read the file as binary

            try {
                // Step 1: Decrypt the data
                const decryptedData = await decryptData(encryptedData, password);
                console.log('Decrypted Data:', decryptedData);

                // Step 2: Decode the decrypted data
                const decryptedStr = toString(decryptedData);
                const decodedData = fromJson(decryptedStr);
                const fixedData = fixMapping(decodedData);
                showLoading();
                await new Promise(resolve => setTimeout(resolve, 3000));
                populateData(fixedData);
                ghostTable(fixedData);
                playedMapsTable(fixedData);
                console.log('Decoded and Fixed Data:', fixedData); // Handle the fixed data as needed
            } catch (error) {
                console.error('Decoding failed:', error);
                alert('Decoding failed. Please check your file or password.');
            }
        };

        reader.readAsArrayBuffer(file); // Read the file as ArrayBuffer
    });

    // Check if a badge is completed based on value
    function hasBadge(data, x) {
        if (!data[x]) {
            return 'Not Completed';
        } else if (data[x]?.value == null) {
            return 'Not Completed';
        } else {
            return 'Completed';
        }
    }
    

    // Check progress for the "Lighthouse Keeper" badge
    function lighthouseKeeper(data) {
        if (!data.lighthouseKeeperProgression || data.lighthouseKeeperProgression.value == null) {
            return '0';
        }
        if (data.lighthouseKeeperProgression.value == 50) return 'Completed';
        return data.lighthouseKeeperProgression.value;
    }

    // Check if holiday 2022 event is completed
    function holiday22(data) {
        if (
            data["10 Ridgeview CourtChristmasComplete"]?.value === 1 &&
            data["Grafton FarmhouseChristmasComplete"]?.value === 1 &&
            data["Camp WoodwindChristmasComplete"]?.value === 1 &&
            data["Bleasdale FarmhouseChristmasComplete"]?.value === 1 &&
            data["6 Tanglewood DriveChristmasComplete"]?.value === 1 &&
            data["42 Edgefield RoadChristmasComplete"]?.value === 1 &&
            data["13 Willow StreetChristmasComplete"]?.value === 1
        ) {
            return 'Completed';
        } else {
            return 'Not Completed';
        }
    }
    
    function holiday23(data) {
        if (
            data["10 Ridgeview CourtHoliday23Complete"]?.value === 1 &&
            data["Grafton FarmhouseHoliday23Complete"]?.value === 1 &&
            data["Camp WoodwindHoliday23Complete"]?.value === 1 &&
            data["Bleasdale FarmhouseHoliday23Complete"]?.value === 1 &&
            data["6 Tanglewood DriveHoliday23Complete"]?.value === 1 &&
            data["42 Edgefield RoadHoliday23Complete"]?.value === 1 &&
            data["13 Willow StreetHoliday23Complete"]?.value === 1
        ) {
            return 'Completed';
        } else {
            return 'Not Completed';
        }
    }
    
    function easter23(data) {
        if (
            data["10 Ridgeview CourtEaster2023Complete"]?.value === 1 &&
            data["Grafton FarmhouseEaster2023Complete"]?.value === 1 &&
            data["Camp WoodwindEaster2023Complete"]?.value === 1 &&
            data["Bleasdale FarmhouseEaster2023Complete"]?.value === 1 &&
            data["6 Tanglewood DriveEaster2023Complete"]?.value === 1 &&
            data["42 Edgefield RoadEaster2023Complete"]?.value === 1 &&
            data["13 Willow StreetEaster2023Complete"]?.value === 1
        ) {
            return 'Completed';
        } else {
            return 'Not Completed';
        }
    }

    function safeGetValue(data, field) {
        return data?.[field]?.value ?? '0';
    }

    function convertToTimeFormat(seconds) {
        if (!seconds || isNaN(seconds)) return '00:00:00';
        seconds = Math.floor(seconds);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
    
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function convertToMeters(meters){
        if (!meters || isNaN(meters)) return '0';
        return Math.round(meters) + ' meters';
    }

    function roundPrecent(value) {
        if (!value || isNaN(value)) return '0%';
        return Math.round(value) + '%';
    }


    function populateData(data) {
        // Player Statistics
        document.getElementById('prestige').textContent = safeGetValue(data, 'Prestige');
        document.getElementById('level').textContent = safeGetValue(data, 'NewLevel');
        document.getElementById('oldLevel').textContent = safeGetValue(data, 'Level');
        document.getElementById('playerMoney').textContent = safeGetValue(data, 'PlayersMoney');
        document.getElementById('objectivesCompleted').textContent = safeGetValue(data, 'objectivesCompleted');
        document.getElementById('ghostsIdentifiedAmount').textContent = safeGetValue(data, 'ghostsIdentifiedAmount');
        document.getElementById('ghostsMisidentifiedAmount').textContent = safeGetValue(data, 'ghostsMisidentifiedAmount');
        document.getElementById('phrasesRecognized').textContent = safeGetValue(data, 'phrasesRecognized');
        document.getElementById('itemsBought').textContent = safeGetValue(data, 'itemsBought');
        document.getElementById('itemsLost').textContent = safeGetValue(data, 'itemsLost');
        document.getElementById('moneySpent').textContent = safeGetValue(data, 'moneySpent');
        document.getElementById('moneyEarned').textContent = safeGetValue(data, 'moneyEarned');
        document.getElementById('diedAmount').textContent = safeGetValue(data, 'diedAmount');
        document.getElementById('timeSpentInvestigating').textContent = convertToTimeFormat(safeGetValue(data, 'timeSpentInvestigating'));
        document.getElementById('timeSpentInLight').textContent = convertToTimeFormat(safeGetValue(data, 'timeSpentInLight'));
        document.getElementById('timeSpentInDark').textContent = convertToTimeFormat(safeGetValue(data, 'timeSpentInDark'));
        document.getElementById('timeSpentBeingChased').textContent = convertToTimeFormat(safeGetValue(data, 'timeSpentBeingChased'));
        document.getElementById('timeSpentInGhostsRoom').textContent = convertToTimeFormat(safeGetValue(data, 'timeSpentInGhostsRoom'));
        document.getElementById('timeSpentInTruck').textContent = convertToTimeFormat(safeGetValue(data, 'timeSpentInTruck'));
        document.getElementById('ghostsRepelled').textContent = safeGetValue(data, 'ghostsRepelled');
        document.getElementById('sanityGained').textContent = roundPrecent(safeGetValue(data, 'sanityGained'));
        document.getElementById('sanityLost').textContent = roundPrecent(safeGetValue(data, 'sanityLost'));
        document.getElementById('distanceTravelled').textContent = convertToMeters(safeGetValue(data, 'distanceTravelled'));
        document.getElementById('amountOfBonesCollected').textContent = safeGetValue(data, 'amountOfBonesCollected');
        document.getElementById('photosTaken').textContent = safeGetValue(data, 'photosTaken');
    
        // Badges
        document.getElementById('lighthouseKeeper').textContent = lighthouseKeeper(data) || 'N/A';
        document.getElementById('apocalypseBronze').textContent = hasBadge(data, "ApocalypseBronzeCompleted") || 'N/A';
        document.getElementById('apocalypseSilver').textContent = hasBadge(data, "ApocalypseSilverCompleted") || 'N/A';
        document.getElementById('apocalypseGold').textContent = hasBadge(data, "ApocalypseGoldCompleted") || 'N/A';
        document.getElementById('holiday22').textContent = holiday22(data) || 'N/A';
        document.getElementById('easter23').textContent = easter23(data) || 'N/A';
        document.getElementById('halloween23').textContent = hasBadge(data, "halloween23Complete") || 'N/A';
        document.getElementById('christmas23').textContent = holiday23(data) || 'N/A';
        document.getElementById('easter24').textContent = hasBadge(data, "Easter2024Complete") || 'N/A';
    
        // Ghost Statistics
        document.getElementById('ghostDistanceTravelled').textContent = convertToMeters(safeGetValue(data, 'ghostDistanceTravelled'));
        document.getElementById('ghostInteractions').textContent = safeGetValue(data, 'amountOfGhostInteractions');
        document.getElementById('abilitiesUsed').textContent = safeGetValue(data, 'abilitiesUsed');
        document.getElementById('ghostHunts').textContent = safeGetValue(data, 'amountOfGhostHunts');
        document.getElementById('timeInFavouriteRoom').textContent = convertToTimeFormat(safeGetValue(data, 'timeInFavouriteRoom'));
        document.getElementById('roomChanged').textContent = safeGetValue(data, 'roomChanged');
        document.getElementById('fuseboxToggles').textContent = safeGetValue(data, 'fuseboxToggles');
        document.getElementById('lightsSwitched').textContent = safeGetValue(data, 'lightsSwitched');
        document.getElementById('objectsUsed').textContent = safeGetValue(data, 'objectsUsed');
        document.getElementById('doorsMoved').textContent = safeGetValue(data, 'doorsMoved');
        document.getElementById('ghostEvents').textContent = safeGetValue(data, 'amountOfGhostEvents');
        document.getElementById('totalHuntTime').textContent = convertToTimeFormat(safeGetValue(data, 'totalHuntTime'));
    
        // Cursed Possession Statistics
        document.getElementById('amountOfCursedPossessionsUsed').textContent = safeGetValue(data, 'amountOfCursedPossessionsUsed');
        document.getElementById('amountOfCursedHuntsTriggered').textContent = safeGetValue(data, 'amountOfCursedHuntsTriggered');
        document.getElementById('musicBoxesFound').textContent = safeGetValue(data, 'MusicBoxesFound');
        document.getElementById('ouijasFound').textContent = safeGetValue(data, 'OuijasFound');
        document.getElementById('summoningCirclesUsed').textContent = safeGetValue(data, 'SummoningCirclesUsed');
        document.getElementById('mirrorsFound').textContent = safeGetValue(data, 'MirrorsFound');
        document.getElementById('monkeyPawFound').textContent = safeGetValue(data, 'MonkeyPawFound');
        document.getElementById('voodoosFound').textContent = safeGetValue(data, 'VoodoosFound');
        document.getElementById('tarotPriestess').textContent = safeGetValue(data, 'TarotPriestess');
        document.getElementById('tarotDeath').textContent = safeGetValue(data, 'TarotDeath');
        document.getElementById('tarotFool').textContent = safeGetValue(data, 'TarotFool');
        document.getElementById('tarotWheel').textContent = safeGetValue(data, 'TarotWheel');
        document.getElementById('tarotTower').textContent = safeGetValue(data, 'TarotTower');
        document.getElementById('tarotDevil').textContent = safeGetValue(data, 'TarotDevil');
        document.getElementById('tarotHermit').textContent = safeGetValue(data, 'TarotHermit');
        document.getElementById('tarotMoon').textContent = safeGetValue(data, 'TarotMoon');
        document.getElementById('tarotSun').textContent = safeGetValue(data, 'TarotSun');
        document.getElementById('tarotHangedMan').textContent = safeGetValue(data, 'TarotHangedMan');
    }
    
    
    

    function ghostTable(data) {
        const commonGhosts = data.mostCommonGhosts.value; // Get mostCommonGhosts
        const ghostKills = data.ghostKills.value; // Get ghostKills

        // Calculate total kills
        const totalKills = Object.values(ghostKills).reduce((acc, val) => acc + val, 0); // Total kills
        const totalGhosts = Object.values(commonGhosts).reduce((acc, val) => acc + val, 0);
        const totalKillPrecentage = totalKills > 0 ? ((totalKills / totalGhosts) * 100).toFixed(2) : 0;

        // Convert commonGhosts to an array of entries and sort by count (most common to least common)
        const sortedGhostEntries = Object.entries(commonGhosts).sort((a, b) => b[1] - a[1]);
        let htmlContent = `
    <tr>
        <th>Ghost Name</th>
        <th>Most Common Count</th>
        <th>Common Percentage</th>
        <th>Kills</th>
        <th>Death Percentage</th>
    </tr>
    `;
        // Loop through the sorted ghost entries and create table rows
        for (const [ghostName, commonCount] of sortedGhostEntries) {
            const commonPercentage = ((commonCount / totalGhosts) * 100).toFixed(2);
            const killCount = ghostKills[ghostName] || 0; // Get kill count from ghostKills
            const killPercentage = totalKills > 0 ? ((killCount / totalKills) * 100).toFixed(2) : 0; // Calculate percentage safely

            htmlContent += `
        <tr>
            <td>${ghostName}</td>
            <td>${commonCount}</td>
            <td>${commonPercentage}%</td>
            <td>${killCount}</td>
            <td>${killPercentage}%</td> <!-- Display the percentage -->
        </tr>`;
        }

        htmlContent += `
        <tr>
            <td><strong>Total</strong></td>
            <td><strong>${totalGhosts}</strong></td>
            <td></td>
            <td><strong>${totalKills}</strong></td>
            <td><strong>${totalKillPrecentage}%</strong></td>
        </tr>`;
        document.getElementById('ghostDataTable').innerHTML = htmlContent;
    }

    function playedMapsTable(data) {
        const playedMaps = data.playedMaps; // Get the playedMaps object
        if (playedMaps && playedMaps.value) {
            const mapValues = playedMaps.value; // Access the value property

            // Calculate total plays
            const totalPlays = Object.values(mapValues).reduce((acc, val) => acc + val, 0);

            // Convert mapValues to an array of entries and sort by value (most played to least played)
            const sortedMapEntries = Object.entries(mapValues).sort((a, b) => b[1] - a[1]);
            let htmlContent = `
        <tr>
            <th>Map Name</th>
            <th>Play Count</th>
            <th>Percentage</th>
        </tr>
        `;
            // Loop through the sorted entries and create table rows
            for (const [mapName, playCount] of sortedMapEntries) {
                const percentage = ((playCount / totalPlays) * 100).toFixed(2); // Calculate percentage
                htmlContent += `
            <tr>
                <td>${mapName || 'Unknown'}</td> <!-- Display "Unknown" if mapName is not found -->
                <td>${playCount}</td>
                <td>${percentage}%</td> <!-- Display the percentage -->
            </tr>`;
            }
            // Step 3.2: Add a total row at the end of the table
            htmlContent += `
        <tr>
            <td colspan="1"><strong>Total Plays</strong></td>
            <td colspan="1"><strong>${totalPlays}</strong></td>
        </tr>
        </table>
        </article>
        </section>
</body>
`;
            document.getElementById('mapsDataTable').innerHTML = htmlContent;
        }
    }
});