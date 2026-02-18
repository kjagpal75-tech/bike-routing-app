// Test the regex patterns for street name extraction

function testPattern(instruction, pattern, description) {
    const match = instruction.match(pattern);
    console.log(`${description}:`);
    console.log(`  Input: "${instruction}"`);
    console.log(`  Match: ${match ? JSON.stringify(match) : 'No match'}`);
    console.log(`  Street Name: ${match ? match[1] || match[2] : 'None'}`);
    console.log('');
}

// Test Pattern 1
const pattern1 = /(?:Turn|Head|Continue|Stay|Merge|Go straight|Keep|Sharp) (?:right|left|north|south|east|west|straight) (?:onto|on) (?:the )?([A-Z][a-z0-9\s-]+)/i;

console.log('=== Pattern 1 Tests ===');
testPattern('Turn right onto Main Street', pattern1, 'Turn right onto Main Street');
testPattern('Continue on Oak Avenue', pattern1, 'Continue on Oak Avenue');
testPattern('Head north on Elm Street', pattern1, 'Head north on Elm Street');
testPattern('Merge onto Highway 101', pattern1, 'Merge onto Highway 101');
testPattern('Keep right', pattern1, 'Keep right (no street)');
testPattern('Continue', pattern1, 'Continue (no street)');

// Test Pattern 2
const pattern2 = /(?:onto|on) (?:the )?([A-Z][a-z0-9\s-]+)/i;

console.log('=== Pattern 2 Tests ===');
testPattern('Turn right onto Main Street', pattern2, 'Turn right onto Main Street');
testPattern('Continue on Oak Avenue', pattern2, 'Continue on Oak Avenue');
testPattern('Head north on Elm Street', pattern2, 'Head north on Elm Street');

// Test Pattern 3
const pattern3 = /([A-Z][a-z0-9\s-]+)$/;

console.log('=== Pattern 3 Tests ===');
testPattern('Turn right onto Main Street', pattern3, 'Turn right onto Main Street');
testPattern('Continue on Oak Avenue', pattern3, 'Continue on Oak Avenue');
testPattern('Keep right', pattern3, 'Keep right (should be filtered out)');
testPattern('Continue', pattern3, 'Continue (should be filtered out)');

// Test Pattern 4
console.log('=== Pattern 4 Tests ===');
function testPattern4(instruction) {
    const words = instruction.split(' ');
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (/^[A-Z][a-z]/.test(word) && 
            !/^(Turn|Head|Continue|Stay|Merge|Go|Keep|Sharp|right|left|north|south|east|west|straight|onto|on|the|and|or|at|in|for|of|to)$/i.test(word)) {
            let streetName = word;
            let j = i + 1;
            while (j < words.length && /^[A-Z][a-z]/.test(words[j])) {
                streetName += ' ' + words[j];
                j++;
            }
            if (streetName.length > 3) {
                console.log(`Pattern 4: "${instruction}" -> "${streetName}"`);
                return streetName;
            }
        }
    }
    console.log(`Pattern 4: "${instruction}" -> No street name found`);
}

testPattern4('Turn right onto Main Street');
testPattern4('Continue on Oak Avenue');
testPattern4('Head north on Elm Street');
testPattern4('Keep right');
testPattern4('Continue');
