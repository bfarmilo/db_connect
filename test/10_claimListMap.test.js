const claimList = require('./sampleResult.json');

const flatten = list => list.reduce(
    (a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []
);


// three stages -- convert each patent entry into a flat array per claim
// flatten that array, so it is just a flat array of items one per claim
// map it to get the form [key, value]
// convert to a Map

const claimMap = new Map(flatten(claimList.map(patent => {
    let item = Object.assign({}, patent)
    delete item.claims;
    return patent.claims.map(claim =>({
        ...item,
        ...claim
    }))
}
)).map(record => {
    return [record.ClaimID, record]
})
);

console.log(
    claimMap.entries(),
    claimMap.delete(1786),
    claimMap.entries()
);