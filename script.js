let dictionary = [];
let allTags = new Set();
let filteredEntries = [];
let tagValues = {}; // { tag: Set of values }
let startingLetters = new Set();
let gcValues = new Set();
let currentPage = 1;
const itemsPerPage = 5;

// नए वैरिएबल्स साइडबार के लिए
let wordMap = {};           // शब्द → पूरी एंट्री
let sortedWords = [];       // सभी शब्दों की सॉर्टेड लिस्ट
let currentStartLetter = ''; // वर्तमान चुना हुआ आद्यक्षर

// XML लोड करना
document.addEventListener('DOMContentLoaded', () => {
    const loader = document.getElementById('divineLoader');
    if (loader) loader.classList.remove('hidden');
});

fetch('vachaspatyam.xml')
    .then(response => response.text())
    .then(xmlText => {
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, "application/xml");
        const entries = xml.querySelectorAll('entry');

        entries.forEach(entry => {
            const obj = {};
            entry.querySelectorAll('*').forEach(child => {
                const tagName = child.tagName;
                allTags.add(tagName);

                if (!obj[tagName]) obj[tagName] = [];
                const value = child.textContent.trim();
                if (value) obj[tagName].push(value);

                // टैग वैल्यूज़ कलेक्ट करना
                if (!tagValues[tagName]) tagValues[tagName] = new Set();
                tagValues[tagName].add(value);

                // विशेष हैंडलिंग
                if (tagName === 'V' && value) {
                    startingLetters.add(value[0]);
                }
                if (tagName === 'GC' && value) {
                    gcValues.add(value);
                }
            });
            dictionary.push(obj);

            // साइडबार के लिए वर्ड मैप बनाना
            if (obj.V && obj.V[0]) {
                const word = obj.V[0].trim();
                if (word && !wordMap[word]) {
                    wordMap[word] = obj;
                    sortedWords.push(word);
                }
            }
        });

        sortedWords.sort();

        generateDynamicFilters();
        generateTagVisibility();
        generateTagFilters();
        generateAlphabetNav();          // नया: आद्यक्षर नेविगेशन
        populateWordList();             // शुरुआत में सभी शब्द दिखाएं

        filteredEntries = dictionary;
        currentPage = 1;
        renderPaginatedEntries('');

        // लोडर हटाएं
        const loader = document.getElementById('divineLoader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 1000);
        }
    })
    .catch(err => {
        document.getElementById('results').innerHTML = 
            '<p class="no-results">vachaspatyam.xml इति संचिका न लब्धा। कृपया तां स्थापयतु।</p>';
        console.error(err);
    });

// डायनामिक फ़िल्टर्स जनरेट करना
function generateDynamicFilters() {
    const startingSelect = document.getElementById('startingLetterFilter');
    [...startingLetters].sort().forEach(letter => {
        const opt = document.createElement('option');
        opt.value = letter;
        opt.textContent = letter;
        startingSelect.appendChild(opt);
    });

    const gcSelect = document.getElementById('gcFilter');
    [...gcValues].sort().forEach(gc => {
        const opt = document.createElement('option');
        opt.value = gc;
        opt.textContent = gc;
        gcSelect.appendChild(opt);
    });
}

// टैग विज़िबिलिटी (संस्कृत लेबल के साथ)
function generateTagVisibility() {
    const container = document.getElementById('tagVisibility');
    container.innerHTML = '';

    const tagLabels = {
        V:    "शब्दः (Vocable)",
        GC:   "लिङ्गम् (Grammatical Category)",
        GR:   "व्युत्पत्तिः (Grammar & Root)",
        ET:   "व्युत्पत्ति-विवरणम् (Etymology)",
        EXP:  "व्याख्या (Explanation)",
        CA:   "समास-विश्लेषणम् (Compound Analysis)",
        CT:   "उद्धरणम् (Citation Text)",
        RM:   "सन्दर्भः (Reference Mode)",
        WM:   "मुख्यार्थः (Word Meaning)"
    };

    [...allTags].sort().forEach(tag => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'show' + tag;
        checkbox.checked = (tag === 'V' || tag === 'WM');

        label.appendChild(checkbox);
        const displayText = tagLabels[tag] || tag;
        label.appendChild(document.createTextNode(' ' + displayText));
        container.appendChild(label);
    });
}

// टैग फ़िल्टर्स जनरेट करना
function generateTagFilters() {
    const container = document.getElementById('tagFilters');
    container.innerHTML = '';
    [...allTags].sort().forEach(tag => {
        if (tag === 'V' || tag === 'WM' || tag === 'CT') return;

        const group = document.createElement('div');
        group.className = 'filter-group';

        const label = document.createElement('label');
        label.textContent = `${tag} मूल्येन पृथक्करोतु`;
        group.appendChild(label);

        const select = document.createElement('select');
        select.id = 'filter_' + tag;
        select.innerHTML = '<option value="">सर्वाणि</option>';

        [...tagValues[tag]].sort().forEach(val => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            select.appendChild(opt);
        });

        group.appendChild(select);
        container.appendChild(group);
    });
}

// आद्यक्षर नेविगेशन (साइडबार के लिए)
function generateAlphabetNav() {
    const nav = document.getElementById('alphabetNav');
    if (!nav) return;
    nav.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.textContent = 'सर्वाणि';
    allBtn.onclick = () => {
        currentStartLetter = '';
        populateWordList();
    };
    nav.appendChild(allBtn);

    [...startingLetters].sort().forEach(letter => {
        const btn = document.createElement('button');
        btn.textContent = letter;
        btn.onclick = () => {
            currentStartLetter = letter;
            populateWordList();
        };
        nav.appendChild(btn);
    });
}

// साइडबार में शब्दों की लिस्ट भरना
function populateWordList() {
    const sidebarSearch = document.getElementById('sidebarSearch');
    const searchVal = sidebarSearch ? sidebarSearch.value.trim().toLowerCase() : '';
    let filtered = sortedWords;

    if (currentStartLetter) {
        filtered = filtered.filter(w => w.startsWith(currentStartLetter));
    }
    if (searchVal) {
        filtered = filtered.filter(w => w.toLowerCase().includes(searchVal));
    }

    const list = document.getElementById('wordList');
    if (!list) return;
    list.innerHTML = '';

    filtered.forEach(word => {
        const li = document.createElement('li');
        li.textContent = word;
        li.addEventListener('click', () => {
            renderSingleEntry(wordMap[word]);
            // एक्टिव हाइलाइट
            list.querySelectorAll('li').forEach(l => l.classList.remove('active'));
            li.classList.add('active');
        });
        list.appendChild(li);
    });
}

// एकल एंट्री रेंडर करना (साइडबार क्लिक पर)
function renderSingleEntry(entry, query = '') {
    if (!entry) {
        document.getElementById('results').innerHTML = '<p class="no-results">शब्दो न लब्धः।</p>';
        return;
    }

    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    const div = document.createElement('div');
    div.className = 'entry';

    const headWord = entry.V ? highlightText(entry.V[0], query) : 'अज्ञातः';
    div.innerHTML = `<h3>${headWord}</h3>`;

    const tagsDiv = document.createElement('div');
    const tagLabels = {
        V: "शब्दः (Vocable)", GC: "लिङ्गम् (Grammatical Category)", GR: "व्युत्पत्तिः (Grammar & Root)",
        ET: "व्युत्पत्ति-विवरणम् (Etymology)", EXP: "व्याख्या (Explanation)", CA: "समास-विश्लेषणम् (Compound Analysis)",
        CT: "उद्धरणम् (Citation Text)", RM: "सन्दर्भः (Reference Mode)", WM: "मुख्यार्थः (Word Meaning)"
    };

    allTags.forEach(tag => {
        const checkbox = document.getElementById('show' + tag);
        if (checkbox && checkbox.checked && entry[tag]) {
            entry[tag].forEach(value => {
                const highlightedValue = highlightText(value, query);
                const displayTag = tagLabels[tag] || tag;

                if (tag === 'WM' || tag === 'EXP' || tag === 'CT') {
                    tagsDiv.innerHTML += `<div class="content"><span class="tag-name">${displayTag}:</span> ${highlightedValue}</div>`;
                } else {
                    tagsDiv.innerHTML += `<span class="tag"><span class="tag-name">${displayTag}:</span> ${highlightedValue}</span>`;
                }
            });
        }
    });

    div.appendChild(tagsDiv);
    resultsDiv.appendChild(div);
}

// मीनिंग टेक्स्ट निकालना (सर्च के लिए)
function getMeaningText(entry) {
    let text = '';
    Object.keys(entry).forEach(key => {
        if (key !== 'V') {
            text += entry[key].join(' ') + ' ';
        }
    });
    return text.toLowerCase();
}

// पैजिनेटेड एंट्रीज़ रेंडर करना
function renderPaginatedEntries(query) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    if (filteredEntries.length === 0) {
        resultsDiv.innerHTML = '<p class="no-results">कश्चन शब्दो न लब्धः। कृपया मृग्यपदं परिवर्तयतु।</p>';
        return;
    }

    // अगर केवल एक एंट्री हो तो सिंगल व्यू दिखाएं
    if (filteredEntries.length === 1) {
        renderSingleEntry(filteredEntries[0], query);
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredEntries.length);
    const pageEntries = filteredEntries.slice(startIndex, endIndex);

    const tagLabels = {
        V: "शब्दः (Vocable)", GC: "लिङ्गम् (Grammatical Category)", GR: "व्युत्पत्तिः (Grammar & Root)",
        ET: "व्युत्पत्ति-विवरणम् (Etymology)", EXP: "व्याख्या (Explanation)", CA: "समास-विश्लेषणम् (Compound Analysis)",
        CT: "उद्धरणम् (Citation Text)", RM: "सन्दर्भः (Reference Mode)", WM: "मुख्यार्थः (Word Meaning)"
    };

    pageEntries.forEach(entry => {
        const div = document.createElement('div');
        div.className = 'entry';

        const headWord = entry.V ? highlightText(entry.V[0], query) : 'अज्ञातः';
        div.innerHTML = `<h3>${headWord}</h3>`;

        const tagsDiv = document.createElement('div');

        allTags.forEach(tag => {
            const checkbox = document.getElementById('show' + tag);
            if (checkbox && checkbox.checked && entry[tag]) {
                entry[tag].forEach(value => {
                    const highlightedValue = highlightText(value, query);
                    const displayTag = tagLabels[tag] || tag;

                    if (tag === 'WM' || tag === 'EXP') {
                        tagsDiv.innerHTML += `
                            <div class="content">
                                <span class="tag-name">${displayTag}:</span>
                                ${highlightedValue}
                            </div>`;
                    } else {
                        tagsDiv.innerHTML += `
                            <span class="tag">
                                <span class="tag-name">${displayTag}:</span>
                                ${highlightedValue}
                            </span>`;
                    }
                });
            }
        });

        div.appendChild(tagsDiv);
        resultsDiv.appendChild(div);
    });

    // पैजिनेशन कंट्रोल्स
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination';
    paginationDiv.style.textAlign = 'center';
    paginationDiv.style.marginTop = '30px';

    const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);

    if (currentPage > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '←';
        prevBtn.style.padding = '10px 20px';
        prevBtn.style.margin = '0 10px';
        prevBtn.style.fontSize = '16px';
        prevBtn.onclick = () => {
            currentPage--;
            renderPaginatedEntries(query);
            window.scrollTo(0, 0);
        };
        paginationDiv.appendChild(prevBtn);
    }

    const info = document.createElement('span');
    info.textContent = `पृष्ठम् ${currentPage} / ${totalPages} (आहत्य ${filteredEntries.length} शब्दाः)`;
    info.style.fontSize = '18px';
    info.style.margin = '0 20px';
    paginationDiv.appendChild(info);

    if (currentPage < totalPages) {
        const nextBtn = document.createElement('button');
        nextBtn.textContent = '→';
        nextBtn.style.padding = '10px 20px';
        nextBtn.style.margin = '0 10px';
        nextBtn.style.fontSize = '16px';
        nextBtn.onclick = () => {
            currentPage++;
            renderPaginatedEntries(query);
            window.scrollTo(0, 0);
        };
        paginationDiv.appendChild(nextBtn);
    }

    resultsDiv.appendChild(paginationDiv);
}

// हाइलाइट टेक्स्ट
function highlightText(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

// फ़िल्टर एंट्रीज़
function filterEntries() {
    let filtered = dictionary;

    const query = document.getElementById('search').value.trim();
    const searchMode = document.querySelector('input[name="searchMode"]:checked').value;

    if (query) {
        const lowerQuery = query.toLowerCase();
        if (searchMode === 'wordOnly') {
            filtered = filtered.filter(entry => entry.V && entry.V.some(v => v.toLowerCase().includes(lowerQuery)));
        } else if (searchMode === 'meaningOnly') {
            filtered = filtered.filter(entry => getMeaningText(entry).includes(lowerQuery));
        } else {
            filtered = filtered.filter(entry => 
                (entry.V && entry.V.some(v => v.toLowerCase().includes(lowerQuery))) || 
                getMeaningText(entry).includes(lowerQuery)
            );
        }
    }

    const startingLetter = document.getElementById('startingLetterFilter').value;
    if (startingLetter) {
        filtered = filtered.filter(entry => entry.V && entry.V[0].startsWith(startingLetter));
    }

    const gc = document.getElementById('gcFilter').value;
    if (gc) {
        filtered = filtered.filter(entry => entry.GC && entry.GC.includes(gc));
    }

    allTags.forEach(tag => {
        const select = document.getElementById('filter_' + tag);
        if (select && select.value) {
            const filterValue = select.value;
            filtered = filtered.filter(entry => 
                entry[tag] && entry[tag].includes(filterValue)
            );
        }
    });

    filteredEntries = filtered;
    currentPage = 1;
    renderPaginatedEntries(query);
}

// टॉगल फ़िल्टर्स (मोबाइल के लिए)
document.getElementById('toggleFilters').addEventListener('click', () => {
    const panel = document.getElementById('filtersPanel');
    const btn = document.getElementById('toggleFilters');
    btn.classList.toggle('active');
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';

    if (panel.classList.contains('show')) {
        panel.classList.remove('show');
        setTimeout(() => { panel.style.display = 'none'; }, 1);
    } else {
        panel.style.display = 'grid';
        requestAnimationFrame(() => { panel.classList.add('show'); });
    }
});

// साइडबार सर्च
document.getElementById('sidebarSearch')?.addEventListener('input', populateWordList);

// सभी मुख्य इवेंट्स
document.getElementById('search').addEventListener('input', filterEntries);
document.querySelectorAll('input[name="searchMode"]').forEach(radio => radio.addEventListener('change', filterEntries));
document.getElementById('startingLetterFilter').addEventListener('change', filterEntries);
document.getElementById('gcFilter').addEventListener('change', filterEntries);
document.getElementById('filtersPanel').addEventListener('change', filterEntries);



// अकॉर्डियन टॉगल फ़ंक्शन
function toggleAccordion(button) {
    const content = button.nextElementSibling;
    const arrow = button.querySelector('.arrow');
    const isOpen = content.classList.contains('open');

    if (isOpen) {
        content.classList.remove('open');
        arrow.textContent = '▼';
        button.classList.remove('active');
    } else {
        content.classList.add('open');
        arrow.textContent = '▲';
        button.classList.add('active');
    }
}