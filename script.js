// Helper function for querying DOM elements safely:
function getEl(selector) {
    const element = document.querySelector(selector);
    if (!element) {
        console.warn(`Element not found: ${selector}`);
    }
    return element;
}

function copyToClipboard() {
    const copyTextElement = getEl("#copyText");
    if (!copyTextElement) return; // Exit early if element is missing

    const copyText = copyTextElement.innerHTML;
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
        Asylum: null,
        PointHope: 14
    };

    async function decryptData(encryptedData, password) {
        // Extract the IV from the first 16 bytes and the rest of the data
        const iv = encryptedData.subarray(0, 16);
        const key = await window.crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(password),
            { name: "PBKDF2" },
            false, ["deriveKey"]
        );
        const derivedKey = await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: iv,
                iterations: 100,
                hash: "SHA-1"
            },
            key,
            { name: "AES-CBC", length: 128 },
            false, ["decrypt"]
        );
    
        const decryptedData = await window.crypto.subtle.decrypt(
            { name: "AES-CBC", iv: iv },
            derivedKey,
            encryptedData.subarray(16)
        );
    
        return new Uint8Array(decryptedData);
    }

    function decodeData(data) {
        const decoder = new TextDecoder("utf-8");
        const str = decoder.decode(data);
        return str.slice(0, str.lastIndexOf("}") + 1).trim();
    }
    
    function fixString(data) {
        const trimmed = data.trim().replace(/\r/g, "").replace(/\n/g, "").replace(/\t/g, "");
        console.log("Trimmed Data:", trimmed);
    
        // Ensure all property names, including negative and numeric keys, are wrapped in quotes
        const fullyFixedData = trimmed
            .replace(/([{,]\s*)(-?\d+)(\s*:)/g, '$1"$2"$3')  // Wrap keys with quotes, including negatives
            .replace(/([{,]\s*)([a-zA-Z_]+)(\s*:)/g, '$1"$2"$3'); // Wrap unquoted alphabetic keys
    
        console.log("Fully Fixed Data:", fullyFixedData);
        return fullyFixedData;
    }
    
    function parseJson(data) {
        const fixedData = fixString(data);
    
        try {
            console.log("Data Before Parsing:", fixedData);
            const jsonData = JSON.parse(fixedData);
            console.log("Parsed JSON Data:", jsonData);
            return jsonData;
        } catch (error) {
            const errorPosition = error.message.match(/column (\d+)/)?.[1];
            
            if (errorPosition) {
                const position = parseInt(errorPosition);
                console.error("Error detected near:", fixedData.slice(position - 50, position + 50));
            }
    
            console.error("JSON Parsing Failed:", error);
            throw new Error(`Failed to parse JSON: ${error.message}`);
        }
    }
    
    function mapPlayedMaps(mapping) {
        // Ensure mapping.playedMaps exists and is an object with a value property.
        if (!mapping.playedMaps || typeof mapping.playedMaps !== 'object') {
            mapping.playedMaps = { value: {} };
            return mapping;
        }
        if (typeof mapping.playedMaps.value !== 'object') {
            mapping.playedMaps.value = {};
        }
    
        const playedMaps = mapping.playedMaps.value; // Guaranteed to be an object now
        const playedMapsFixed = {};
    
        for (const [k, v] of Object.entries(playedMaps)) {
            // Parse the key as an integer and find the corresponding map name.
            const mapName = Object.keys(MapID).find(key => MapID[key] === parseInt(k.replace(/"/g, '')));
            // Ensure v is converted to an integer, in case it's a string
            const value = typeof v === "string" ? parseInt(v.replace(/"/g, '')) : parseInt(v);
            if (mapName) {
                playedMapsFixed[mapName] = value;
            }
        }
    
        mapping.playedMaps.value = playedMapsFixed;
        return mapping;
    }
    function showLoading() {
        const overlay = getEl('#loadingOverlay');
        if (overlay) overlay.style.display = 'flex';
    }
    
    function hideLoading() {
        const overlay = getEl('#loadingOverlay');
        if (overlay) overlay.style.display = 'none';
    }
    
    const processDataBtn = getEl('#processDataBtn');
    processDataBtn && processDataBtn.addEventListener('click', async () => {
        const fileInput = getEl('#jsonFileInput');
        const password = 't36gref9u84y7f43g';
    
        if (!fileInput || !fileInput.files.length) {
            alert('Please select a file.');
            return;
        }
    
        const file = fileInput.files[0];
        const reader = new FileReader();
    
        reader.onload = async (event) => {
            const encryptedData = new Uint8Array(event.target.result);
    
            try {
                const decryptedData = await decryptData(encryptedData, password);
                const decryptedStr = decodeData(decryptedData);    
                const decodedData = parseJson(decryptedStr);
                const mappedData = mapPlayedMaps(decodedData);
                    
                showLoading();
                await new Promise(resolve => setTimeout(resolve, 3000));  // Simulate delay
    
                populateData(mappedData);
                ghostTable(mappedData);
                playedMapsTable(mappedData);
            } catch (error) {
                console.error('Processing Failed:', error);
                alert('Processing failed. Please check your file or password.');
            } finally {
                hideLoading();
            }
        };
    
        reader.readAsArrayBuffer(file);
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
        if (data.lighthouseKeeperProgression.value === 50) return 'Completed';
        return data.lighthouseKeeperProgression.value;
    }

    function sunnyMeadowsSurvival(data) {
        if (!data.sunnyMeadowsSurvivalProgression || data.sunnyMeadowsSurvivalProgression.value == null) {
            return '0';
        }
        if (data.sunnyMeadowsSurvivalProgression.value === 50) return 'Completed';
        return data.sunnyMeadowsSurvivalProgression.value;
    }

    function rangerChallengeProgression(data) {
        if (!data.rangerChallengeProgression || data.rangerChallengeProgression.value == null) {
            return '0';
        }
        if (data.rangerChallengeProgression.value === 50) return 'Completed';
        return data.rangerChallengeProgression.value;
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

    function convertToMeters(meters) {
        if (!meters || isNaN(meters)) return '0';
        return Math.round(meters) + ' meters';
    }

    function roundPrecent(value) {
        if (!value || isNaN(value)) return '0%';
        return Math.round(value) + '%';
    }

    function populateData(data) {
        // Player Statistics
        getEl('#prestige') && (getEl('#prestige').textContent = safeGetValue(data, 'Prestige'));
        getEl('#level') && (getEl('#level').textContent = safeGetValue(data, 'NewLevel'));
        getEl('#oldLevel') && (getEl('#oldLevel').textContent = safeGetValue(data, 'Level'));
        getEl('#playerMoney') && (getEl('#playerMoney').textContent = safeGetValue(data, 'PlayersMoney'));
        getEl('#objectivesCompleted') && (getEl('#objectivesCompleted').textContent = safeGetValue(data, 'objectivesCompleted'));
        getEl('#ghostsIdentifiedAmount') && (getEl('#ghostsIdentifiedAmount').textContent = safeGetValue(data, 'ghostsIdentifiedAmount'));
        getEl('#ghostsMisidentifiedAmount') && (getEl('#ghostsMisidentifiedAmount').textContent = safeGetValue(data, 'ghostsMisidentifiedAmount'));
        getEl('#phrasesRecognized') && (getEl('#phrasesRecognized').textContent = safeGetValue(data, 'phrasesRecognized'));
        getEl('#itemsBought') && (getEl('#itemsBought').textContent = safeGetValue(data, 'itemsBought'));
        getEl('#itemsLost') && (getEl('#itemsLost').textContent = safeGetValue(data, 'itemsLost'));
        getEl('#moneySpent') && (getEl('#moneySpent').textContent = safeGetValue(data, 'moneySpent'));
        getEl('#moneyEarned') && (getEl('#moneyEarned').textContent = safeGetValue(data, 'moneyEarned'));
        getEl('#diedAmount') && (getEl('#diedAmount').textContent = safeGetValue(data, 'diedAmount'));
        getEl('#timeSpentInvestigating') && (getEl('#timeSpentInvestigating').textContent = convertToTimeFormat(safeGetValue(data, 'timeSpentInvestigating')));
        getEl('#timeSpentInLight') && (getEl('#timeSpentInLight').textContent = convertToTimeFormat(safeGetValue(data, 'timeSpentInLight')));
        getEl('#timeSpentInDark') && (getEl('#timeSpentInDark').textContent = convertToTimeFormat(safeGetValue(data, 'timeSpentInDark')));
        getEl('#timeSpentBeingChased') && (getEl('#timeSpentBeingChased').textContent = convertToTimeFormat(safeGetValue(data, 'timeSpentBeingChased')));
        getEl('#timeSpentInGhostsRoom') && (getEl('#timeSpentInGhostsRoom').textContent = convertToTimeFormat(safeGetValue(data, 'timeSpentInGhostsRoom')));
        getEl('#timeSpentInTruck') && (getEl('#timeSpentInTruck').textContent = convertToTimeFormat(safeGetValue(data, 'timeSpentInTruck')));
        getEl('#ghostsRepelled') && (getEl('#ghostsRepelled').textContent = safeGetValue(data, 'ghostsRepelled'));
        getEl('#sanityGained') && (getEl('#sanityGained').textContent = roundPrecent(safeGetValue(data, 'sanityGained')));
        getEl('#sanityLost') && (getEl('#sanityLost').textContent = roundPrecent(safeGetValue(data, 'sanityLost')));
        getEl('#distanceTravelled') && (getEl('#distanceTravelled').textContent = convertToMeters(safeGetValue(data, 'distanceTravelled')));
        getEl('#amountOfBonesCollected') && (getEl('#amountOfBonesCollected').textContent = safeGetValue(data, 'amountOfBonesCollected'));
        getEl('#photosTaken') && (getEl('#photosTaken').textContent = safeGetValue(data, 'photosTaken'));
    
        // Badges
        getEl('#lighthouseKeeper') && (getEl('#lighthouseKeeper').textContent = lighthouseKeeper(data) || 'N/A');
        getEl('#sunnymeadowssurvivalprogression') && (getEl('#sunnymeadowssurvivalprogression').textContent = sunnyMeadowsSurvival(data) || 'N/A');
        getEl('#rangerchallengeprogression') && (getEl('#rangerchallengeprogression').textContent = rangerChallengeProgression(data) || 'N/A');
        getEl('#apocalypseBronze') && (getEl('#apocalypseBronze').textContent = hasBadge(data, "ApocalypseBronzeCompleted") || 'N/A');
        getEl('#apocalypseSilver') && (getEl('#apocalypseSilver').textContent = hasBadge(data, "ApocalypseSilverCompleted") || 'N/A');
        getEl('#apocalypseGold') && (getEl('#apocalypseGold').textContent = hasBadge(data, "ApocalypseGoldCompleted") || 'N/A');
        getEl('#holiday22') && (getEl('#holiday22').textContent = holiday22(data) || 'N/A');
        getEl('#easter23') && (getEl('#easter23').textContent = easter23(data) || 'N/A');
        getEl('#halloween23') && (getEl('#halloween23').textContent = hasBadge(data, "halloween23Complete") || 'N/A');
        getEl('#christmas23') && (getEl('#christmas23').textContent = holiday23(data) || 'N/A');
        getEl('#easter24') && (getEl('#easter24').textContent = hasBadge(data, "Easter2024Complete") || 'N/A');
    
        // Ghost Statistics
        getEl('#ghostDistanceTravelled') && (getEl('#ghostDistanceTravelled').textContent = convertToMeters(safeGetValue(data, 'ghostDistanceTravelled')));
        getEl('#ghostInteractions') && (getEl('#ghostInteractions').textContent = safeGetValue(data, 'amountOfGhostInteractions'));
        getEl('#abilitiesUsed') && (getEl('#abilitiesUsed').textContent = safeGetValue(data, 'abilitiesUsed'));
        getEl('#ghostHunts') && (getEl('#ghostHunts').textContent = safeGetValue(data, 'amountOfGhostHunts'));
        getEl('#timeInFavouriteRoom') && (getEl('#timeInFavouriteRoom').textContent = convertToTimeFormat(safeGetValue(data, 'timeInFavouriteRoom')));
        getEl('#roomChanged') && (getEl('#roomChanged').textContent = safeGetValue(data, 'roomChanged'));
        getEl('#fuseboxToggles') && (getEl('#fuseboxToggles').textContent = safeGetValue(data, 'fuseboxToggles'));
        getEl('#lightsSwitched') && (getEl('#lightsSwitched').textContent = safeGetValue(data, 'lightsSwitched'));
        getEl('#objectsUsed') && (getEl('#objectsUsed').textContent = safeGetValue(data, 'objectsUsed'));
        getEl('#doorsMoved') && (getEl('#doorsMoved').textContent = safeGetValue(data, 'doorsMoved'));
        getEl('#ghostEvents') && (getEl('#ghostEvents').textContent = safeGetValue(data, 'amountOfGhostEvents'));
        getEl('#totalHuntTime') && (getEl('#totalHuntTime').textContent = convertToTimeFormat(safeGetValue(data, 'totalHuntTime')));
    
        // Cursed Possession Statistics
        getEl('#amountOfCursedPossessionsUsed') && (getEl('#amountOfCursedPossessionsUsed').textContent = safeGetValue(data, 'amountOfCursedPossessionsUsed'));
        getEl('#amountOfCursedHuntsTriggered') && (getEl('#amountOfCursedHuntsTriggered').textContent = safeGetValue(data, 'amountOfCursedHuntsTriggered'));
        getEl('#musicBoxesFound') && (getEl('#musicBoxesFound').textContent = safeGetValue(data, 'MusicBoxesFound'));
        getEl('#ouijasFound') && (getEl('#ouijasFound').textContent = safeGetValue(data, 'OuijasFound'));
        getEl('#summoningCirclesUsed') && (getEl('#summoningCirclesUsed').textContent = safeGetValue(data, 'SummoningCirclesUsed'));
        getEl('#mirrorsFound') && (getEl('#mirrorsFound').textContent = safeGetValue(data, 'MirrorsFound'));
        getEl('#monkeyPawFound') && (getEl('#monkeyPawFound').textContent = safeGetValue(data, 'MonkeyPawFound'));
        getEl('#voodoosFound') && (getEl('#voodoosFound').textContent = safeGetValue(data, 'VoodoosFound'));
        getEl('#tarotPriestess') && (getEl('#tarotPriestess').textContent = safeGetValue(data, 'TarotPriestess'));
        getEl('#tarotDeath') && (getEl('#tarotDeath').textContent = safeGetValue(data, 'TarotDeath'));
        getEl('#tarotFool') && (getEl('#tarotFool').textContent = safeGetValue(data, 'TarotFool'));
        getEl('#tarotWheel') && (getEl('#tarotWheel').textContent = safeGetValue(data, 'TarotWheel'));
        getEl('#tarotTower') && (getEl('#tarotTower').textContent = safeGetValue(data, 'TarotTower'));
        getEl('#tarotDevil') && (getEl('#tarotDevil').textContent = safeGetValue(data, 'TarotDevil'));
        getEl('#tarotHermit') && (getEl('#tarotHermit').textContent = safeGetValue(data, 'TarotHermit'));
        getEl('#tarotMoon') && (getEl('#tarotMoon').textContent = safeGetValue(data, 'TarotMoon'));
        getEl('#tarotSun') && (getEl('#tarotSun').textContent = safeGetValue(data, 'TarotSun'));
        getEl('#tarotHangedMan') && (getEl('#tarotHangedMan').textContent = safeGetValue(data, 'TarotHangedMan'));
    }
    
    function ghostTable(data) {
        // Ensure that data.mostCommonGhosts and data.ghostKills exist and have a "value" property.
        if (!data.mostCommonGhosts || typeof data.mostCommonGhosts !== 'object') {
            data.mostCommonGhosts = { value: {} };
        }
        if (!data.ghostKills || typeof data.ghostKills !== 'object') {
            data.ghostKills = { value: {} };
        }
    
        const commonGhosts = data.mostCommonGhosts.value || {};
        const ghostKills = data.ghostKills.value || {};
    
        // Calculate total kills safely (if any values are strings, convert them)
        const totalKills = Object.values(ghostKills).reduce((acc, val) => {
            const intVal = parseInt(val);
            return acc + (isNaN(intVal) ? 0 : intVal);
        }, 0);
    
        // Calculate total ghost appearances safely (if any values are strings, convert them)
        const totalGhosts = Object.values(commonGhosts).reduce((acc, val) => {
            const intVal = parseInt(val);
            return acc + (isNaN(intVal) ? 0 : intVal);
        }, 0);
    
        // Avoid division by zero (if totalGhosts is 0, handle accordingly)
        const totalKillPercentage = totalKills > 0 && totalGhosts > 0 ? ((totalKills / totalGhosts) * 100).toFixed(2) : 0;
    
        // Sort ghost entries from most common to least common
        const sortedGhostEntries = Object.entries(commonGhosts).sort((a, b) => {
            const aVal = parseInt(a[1]);
            const bVal = parseInt(b[1]);
            return (isNaN(bVal) ? 0 : bVal) - (isNaN(aVal) ? 0 : aVal);
        });
    
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
            const count = parseInt(commonCount);
            const commonPercentage = totalGhosts > 0 ? ((count / totalGhosts) * 100).toFixed(2) : 0;
            const killCount = parseInt(ghostKills[ghostName]) || 0;
            const killPercentage = totalKills > 0 ? ((killCount / totalKills) * 100).toFixed(2) : 0;
    
            htmlContent += `
            <tr>
                <td>${ghostName}</td>
                <td>${count}</td>
                <td>${commonPercentage}%</td>
                <td>${killCount}</td>
                <td>${killPercentage}%</td>
            </tr>`;
        }
    
        htmlContent += `
            <tr>
                <td><strong>Total</strong></td>
                <td><strong>${totalGhosts}</strong></td>
                <td></td>
                <td><strong>${totalKills}</strong></td>
                <td><strong>${totalKillPercentage}%</strong></td>
            </tr>`;
    
        const ghostDataTable = getEl('#ghostDataTable');
        if (ghostDataTable) {
            ghostDataTable.innerHTML = htmlContent;
        }
    }
    
    function playedMapsTable(data) {
        const playedMaps = data.playedMaps;
        // Check if playedMaps exists, has a value, and that the value object is non-empty
        if (!playedMaps || !playedMaps.value || Object.keys(playedMaps.value).length === 0) {
            // Option 1: Clear the table content if played maps is empty
            const mapsDataTable = getEl('#mapsDataTable');
            if (mapsDataTable) {
                mapsDataTable.innerHTML = '';
            }
            return;
        }
    
        const mapValues = playedMaps.value;
        let totalPlays = Object.values(mapValues).reduce((acc, val) => acc + val, 0);
        const commonGhosts = data.mostCommonGhosts.value;
        const totalGhosts = Object.values(commonGhosts).reduce((acc, val) => acc + val, 0);
    
        const asylum = totalGhosts - totalPlays;
        mapValues["Asylum"] = asylum;
        totalPlays += asylum;
    
        const sortedMapEntries = Object.entries(mapValues).sort((a, b) => b[1] - a[1]);
        let htmlContent = `
            <tr>
                <th>Map Name</th>
                <th>Play Count</th>
                <th>Percentage</th>
            </tr>
        `;
    
        for (const [mapName, playCount] of sortedMapEntries) {
            const percentage = ((playCount / totalPlays) * 100).toFixed(2);
            htmlContent += `
                <tr>
                    <td>${mapName || 'Unknown'}</td>
                    <td>${playCount}</td>
                    <td>${percentage}%</td>
                </tr>
            `;
        }
        htmlContent += `
            <tr>
                <td colspan="1"><strong>Total Plays</strong></td>
                <td colspan="1"><strong>${totalPlays}</strong></td>
            </tr>
        `;
    
        const mapsDataTable = getEl('#mapsDataTable');
        if (mapsDataTable) {
            mapsDataTable.innerHTML = htmlContent;
        }
    }
});
