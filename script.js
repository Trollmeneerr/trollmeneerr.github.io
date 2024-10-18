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
            new TextEncoder().encode(password), 
            { name: "PBKDF2" }, 
            false, 
            ["deriveKey"]
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
            false,
            ["decrypt"]
        );
    
        const decryptedData = await window.crypto.subtle.decrypt(
            { name: "AES-CBC", iv: iv },
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
    
    // Handling the file input and decryption
    document.getElementById('processDataBtn').addEventListener('click', async () => {
        const fileInput = document.getElementById('jsonFileInput');
        const password = 't36gref9u84y7f43g'; // Replace this with the actual password
    
        if (!fileInput.files.length) {
            alert('Please select a file.');
            return;
        }
    
        const file = fileInput.files[0];
        const reader = new FileReader();
    
        reader.onload = async (event) => {
            const encryptedData = new Uint8Array(event.target.result); // Read the file as binary
    
            try {
                // Step 1: Decrypt the data
                const decryptedData = await decryptData(encryptedData, password);
                console.log('Decrypted Data:', decryptedData);
    
                // Step 2: Decode the decrypted data
                const decryptedStr = toString(decryptedData);
                const decodedData = fromJson(decryptedStr);
                const fixedData = fixMapping(decodedData);
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
function hasBadge(value) {
    return value === 0 ? 'Not Completed' : 'Completed';
}

// Check progress for the "Lighthouse Keeper" badge
function lighthouseKeeper(data) {
    if (data.lighthouseKeeperProgression.value === 0) return 'Not Started';
    if (data.lighthouseKeeperProgression.value == 50) return 'Completed';
    else { return data.lighthouseKeeperProgression.value };
}

// Check if holiday 2022 event is completed
function holiday22(data) {
    return (
        data["10 Ridgeview CourtChristmasComplete"]?.value === 1 &&
        data["Grafton FarmhouseChristmasComplete"]?.value === 1 &&
        data["Camp WoodwindChristmasComplete"]?.value === 1 &&
        data["Bleasdale FarmhouseChristmasComplete"]?.value === 1 &&
        data["6 Tanglewood DriveChristmasComplete"]?.value === 1 &&
        data["42 Edgefield RoadChristmasComplete"]?.value === 1 &&
        data["13 Willow StreetChristmasComplete"]?.value === 1
    )
        ? 'Completed'
        : 'Not Completed';
}

// Check if holiday 2023 event is completed
function holiday23(data) {
    return (
        data["10 Ridgeview CourtHoliday23Complete"]?.value === 1 &&
        data["Grafton FarmhouseHoliday23Complete"]?.value === 1 &&
        data["Camp WoodwindHoliday23Complete"]?.value === 1 &&
        data["Bleasdale FarmhouseHoliday23Complete"]?.value === 1 &&
        data["6 Tanglewood DriveHoliday23Complete"]?.value === 1 &&
        data["42 Edgefield RoadHoliday23Complete"]?.value === 1 &&
        data["13 Willow StreetHoliday23Complete"]?.value === 1
    )
        ? 'Completed'
        : 'Not Completed';
}
function easter23(data) {
    return (
        data["10 Ridgeview CourtEaster2023Complete"]?.value === 1 &&
        data["Grafton FarmhouseEaster2023Complete"]?.value === 1 &&
        data["Camp WoodwindEaster2023Complete"]?.value === 1 &&
        data["Bleasdale FarmhouseEaster2023Complete"]?.value === 1 &&
        data["6 Tanglewood DriveEaster2023Complete"]?.value === 1 &&
        data["42 Edgefield RoadEaster2023Complete"]?.value === 1 &&
        data["13 Willow StreetEaster2023Complete"]?.value === 1
    )
        ? 'Completed'
        : 'Not Completed';
}

function populateData(data) {
    // Player Statistics
    document.getElementById('prestige').textContent = data.Prestige.value || 'N/A';
    document.getElementById('level').textContent = data.NewLevel.value || 'N/A';
    document.getElementById('playerMoney').textContent = data.PlayersMoney.value || 'N/A';
    document.getElementById('ghostsIdentifiedAmount').textContent = data.ghostsIdentifiedAmount.value || 'N/A';
    document.getElementById('ghostsMisidentifiedAmount').textContent = data.ghostsMisidentifiedAmount.value || 'N/A';
    document.getElementById('itemsLost').textContent = data.itemsLost.value || 'N/A';
    document.getElementById('itemsBought').textContent = data.itemsBought.value || 'N/A';
    document.getElementById('moneySpent').textContent = data.moneySpent.value || 'N/A';
    document.getElementById('moneyEarned').textContent = data.moneyEarned.value || 'N/A';
    document.getElementById('diedAmount').textContent = data.diedAmount.value || 'N/A';
    document.getElementById('timeSpentInvestigating').textContent = data.timeSpentInvestigating.value || 'N/A';
    document.getElementById('timeSpentInLight').textContent = data.timeSpentInLight.value || 'N/A';
    document.getElementById('timeSpentInDark').textContent = data.timeSpentInDark.value || 'N/A';
    document.getElementById('timeSpentBeingChased').textContent = data.timeSpentBeingChased.value || 'N/A';
    document.getElementById('timeSpentInGhostsRoom').textContent = data.timeSpentInGhostsRoom.value || 'N/A';
    document.getElementById('timeSpentInTruck').textContent = data.timeSpentInTruck.value || 'N/A';
    document.getElementById('sanityGained').textContent = data.sanityGained.value || 'N/A';
    document.getElementById('sanityLost').textContent = data.sanityLost.value || 'N/A';
    document.getElementById('distanceTravelled').textContent = data.distanceTravelled.value || 'N/A';
    document.getElementById('amountOfBonesCollected').textContent = data.amountOfBonesCollected.value || 'N/A';
    document.getElementById('photosTaken').textContent = data.photosTaken.value || 'N/A';

    // Badges
    document.getElementById('lighthouseKeeper').textContent = lighthouseKeeper(data) || 'N/A';
    document.getElementById('apocalypseBronze').textContent = hasBadge(data.ApocalypseBronzeCompleted.value) || 'N/A';
    document.getElementById('apocalypseSilver').textContent = hasBadge(data.ApocalypseSilverCompleted.value) || 'N/A';
    document.getElementById('apocalypseGold').textContent = hasBadge(data.ApocalypseGoldCompleted.value) || 'N/A';
    document.getElementById('holiday22').textContent = holiday22(data) || 'N/A';
    document.getElementById('easter23').textContent = easter23(data) || 'N/A';
    document.getElementById('halloween23').textContent = hasBadge(data.halloween23Complete.value) || 'N/A';
    document.getElementById('christmas23').textContent = holiday23(data) || 'N/A';
    document.getElementById('easter24').textContent = hasBadge(data.Easter2024Complete.value) || 'N/A';

    // Ghost Statistics
    document.getElementById('ghostDistanceTravelled').textContent = data.ghostDistanceTravelled.value || 'N/A';
    document.getElementById('ghostInteractions').textContent = data.amountOfGhostInteractions.value || 'N/A';
    document.getElementById('abilitiesUsed').textContent = data.abilitiesUsed.value || 'N/A';
    document.getElementById('ghostHunts').textContent = data.amountOfGhostHunts.value || 'N/A';
    document.getElementById('timeInFavouriteRoom').textContent = data.timeInFavouriteRoom.value || 'N/A';
    document.getElementById('roomChanged').textContent = data.roomChanged.value || 'N/A';
    document.getElementById('fuseboxToggles').textContent = data.fuseboxToggles.value || 'N/A';
    document.getElementById('lightsSwitched').textContent = data.lightsSwitched.value || 'N/A';
    document.getElementById('objectsUsed').textContent = data.objectsUsed.value || 'N/A';
    document.getElementById('doorsMoved').textContent = data.doorsMoved.value || 'N/A';
    document.getElementById('ghostEvents').textContent = data.amountOfGhostEvents.value || 'N/A';
    document.getElementById('totalHuntTime').textContent = data.totalHuntTime.value || 'N/A';

    // Cursed Possession Statistics
    document.getElementById('musicBoxesFound').textContent = data.MusicBoxesFound.value || 'N/A';
    document.getElementById('ouijasFound').textContent = data.OuijasFound.value || 'N/A';
    document.getElementById('summoningCirclesUsed').textContent = data.SummoningCirclesUsed.value || 'N/A';
    document.getElementById('mirrorsFound').textContent = data.MirrorsFound.value || 'N/A';
    document.getElementById('monkeyPawFound').textContent = data.MonkeyPawFound.value || 'N/A';
    document.getElementById('voodoosFound').textContent = data.VoodoosFound.value || 'N/A';
    document.getElementById('tarotPriestess').textContent = data.TarotPriestess.value || 'N/A';
    document.getElementById('tarotDeath').textContent = data.TarotDeath.value || 'N/A';
    document.getElementById('tarotFool').textContent = data.TarotFool.value || 'N/A';
    document.getElementById('tarotWheel').textContent = data.TarotWheel.value || 'N/A';
    document.getElementById('tarotTower').textContent = data.TarotTower.value || 'N/A';
    document.getElementById('tarotDevil').textContent = data.TarotDevil.value || 'N/A';
    document.getElementById('tarotHermit').textContent = data.TarotHermit.value || 'N/A';
    document.getElementById('tarotMoon').textContent = data.TarotMoon.value || 'N/A';
    document.getElementById('tarotSun').textContent = data.TarotSun.value || 'N/A';
    document.getElementById('tarotHangedMan').textContent = data.TarotHangedMan.value || 'N/A';
}

function ghostTable(data){
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
        <th>Kills</th>
        <th>Death Percentage</th>
    </tr>
    `;
    // Loop through the sorted ghost entries and create table rows
    for (const [ghostName, commonCount] of sortedGhostEntries) {
        const killCount = ghostKills[ghostName] || 0; // Get kill count from ghostKills
        const killPercentage = totalKills > 0 ? ((killCount / totalKills) * 100).toFixed(2) : 0; // Calculate percentage safely
        
        htmlContent += `
        <tr>
            <td>${ghostName}</td>
            <td>${commonCount}</td>
            <td>${killCount}</td>
            <td>${killPercentage}%</td> <!-- Display the percentage -->
        </tr>`;
    }

    htmlContent += `
        <tr>
            <td colspan="1"><strong>Total</strong></td>
            <td colspan="1"><strong>${totalGhosts}</strong></td>
            <td colspan="1"><strong>${totalKills}</strong></td>
            <td colspan="1"><strong>${totalKillPrecentage}%</strong></td>
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


