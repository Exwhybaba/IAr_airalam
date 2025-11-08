// Lightweight in-memory result store for when MongoDB is unavailable
// Not for production persistence; used to keep UI populated in demos.

const resultsMemory = []

export function addResult(doc){
  try{
    resultsMemory.unshift(doc)
    if (resultsMemory.length > 500) resultsMemory.pop()
  }catch{}
}

export function listResults(){
  return resultsMemory
}

export default { addResult, listResults }

