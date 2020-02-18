/// <reference lib="webworker" />

var index: string[];
var subindexCache = {};
var indexDataIdSeparator = '>>>><<<<<';
var indexEntryStartSeparator = '####<<<>>>>####';
var indextEntryEndSeparator = '@@@@@<<<>>>>@@@@@';

addEventListener('message', ({ data }) => {
  const response = `worker response to:`;
  console.log(data);
  let timeout;
  if (data.message === 'set-index') {
    index = data.index;
    indexDataIdSeparator = data.indexDataIdSeparator;
    indexEntryStartSeparator = data.indexEntryStartSeparator;
    indextEntryEndSeparator = data.indextEntryEndSeparator;
  }
  if (data.message === 'search') {
    try {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        const matches = getMatchesForSearchStr(data.searchTerm);
        postMessage({ message: 'search-success', results: matches, searchId: data.searchId })
      })
    
    } catch (err) {
      console.log(err);
    }
  }
});


function getMatchesForSearchStr(searchStr: string): string[] {
  const searchWords = searchStr.trim().split(' ');
  let currIndexArr = getIndexForSearchTerm(searchStr);
  let currMatches;
  searchWords.forEach(word => {
    const regexStr = `${indexEntryStartSeparator}(\\s|[A-Za-z0-9<>\\-_])*(${word})+(\\s|[A-Za-z0-9<>\\-_])*${indextEntryEndSeparator}`;
    const regex = new RegExp(
      regexStr,
      'gi'
    )
    currMatches = currIndexArr.reduce((matches, index) => {
      return [...matches, ...(index.match(regex) || [])]
    }, []);

    if (currMatches) {
      currIndexArr = [currMatches.join('')];
    } else {
      currIndexArr = [''];
    }
  })
  subindexCache[searchStr] = currIndexArr;
  return getResultIdsFromMatches(
    currMatches
  )
}

function getIndexForSearchTerm(searchTerm: string): string[] {
  const cacheKeys = Object.keys(subindexCache);
  for (let i = 0; i < cacheKeys.length; i++) {
    const key = cacheKeys[i];
    if (searchTerm.includes(key)) {
      return subindexCache[key]
    }
  }
  return index;
}


function getResultIdsFromMatches(matches: string[]): string[] {
  if (!matches) {
    return [];
  }
  const replaceRegex = new RegExp(`(${indexEntryStartSeparator}|${indextEntryEndSeparator})`, 'g');
  let results = [];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const stripped = match.replace(replaceRegex, '');
    const id = stripped.split(' ' + indexDataIdSeparator)[1];
    results.push(id);
  }
  return results;
}
