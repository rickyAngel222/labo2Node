///////////////////////////////////////////////////////////////////////////
// This class provide CRUD operations on JSON objects collection text file
// with the assumption that each object have an Id member.
// If the objectsFile does not exist it will be created on demand.
/////////////////////////////////////////////////////////////////////
// Author : Nicolas Chourot
// Lionel-Groulx College
/////////////////////////////////////////////////////////////////////

const fs = require('fs');
const utilities = require('../utilities.js');


class Repository {
    constructor(model) {
        this.objectsList = null;
        this.model = model;
        this.objectsName = model.getClassName() + 's';
        this.objectsFile = `./data/${this.objectsName}.json`;
        this.bindExtraDataMethod = null;
        this.updateResult = {
            ok: 0,
            conflict: 1,
            notFound: 2,
            invalid: 3
        }
    }
    setBindExtraDataMethod(bindExtraDataMethod) {
        this.bindExtraDataMethod = bindExtraDataMethod;
    }
    objects() {
        if (this.objectsList == null)
            this.read();
        return this.objectsList;
    }
    read() {
        try {
            let rawdata = fs.readFileSync(this.objectsFile);
            // we assume here that the json data is formatted correctly
            this.objectsList = JSON.parse(rawdata);
        } catch (error) {
            if (error.code === 'ENOENT') {
                // file does not exist, it will be created on demand
                log(FgYellow, `Warning ${this.objectsName} repository does not exist. It will be created on demand`);
                this.objectsList = [];
            } else {
                log(Bright, FgRed, `Error while reading ${this.objectsName} repository`);
                log(Bright, FgRed, '--------------------------------------------------');
                log(Bright, FgRed, error);
            }
        }
    }
    write() {
        fs.writeFileSync(this.objectsFile, JSON.stringify(this.objectsList));
    }
    nextId() {
        let maxId = 0;
        for (let object of this.objects()) {
            if (object.Id > maxId) {
                maxId = object.Id;
            }
        }
        return maxId + 1;
    }
    add(object) {
        try {
            if (this.model.valid(object)) {
                let conflict = false;
                if (this.model.key) {
                    conflict = this.findByField(this.model.key, object[this.model.key]) != null;
                }
                if (!conflict) {
                    object.Id = this.nextId();
                    this.objectsList.push(object);
                    this.write();
                } else {
                    object.conflict = true;
                }
                return object;
            }
            return null;
        } catch (error) {
            console.log(FgRed, `Error adding new item in ${this.objectsName} repository`);
            console.log(FgRed, '-------------------------------------------------------');
            console.log(Bright, FgRed, error);
            return null;
        }
    }
    update(objectToModify) {
        if (this.model.valid(objectToModify)) {
            let conflict = false;
            if (this.model.key) {
                conflict = this.findByField(this.model.key, objectToModify[this.model.key], objectToModify.Id) != null;
            }
            if (!conflict) {
                let index = 0;
                for (let object of this.objects()) {
                    if (object.Id === objectToModify.Id) {
                        this.objectsList[index] = objectToModify;
                        this.write();
                        return this.updateResult.ok;
                    }
                    index++;
                }
                return this.updateResult.notFound;
            } else {
                return this.updateResult.conflict;
            }
        }
        return this.updateResult.invalid;
    }
    remove(id) {
        let index = 0;
        for (let object of this.objects()) {
            if (object.Id === id) {
                this.objectsList.splice(index, 1);
                this.write();
                return true;
            }
            index++;
        }
        return false;
    }
    getAll(params = null) {
        let objectsList = this.objects();
        if (this.bindExtraDataMethod != null) {
            objectsList = this.bindExtraData(objectsList);
        }
        if (params) {
            let model = this.model;
            let filteredAndSortedObjects = [];
            // TODO Laboratoire 2
            let sortKeys = [];
            let searchKeys = [];
            Object.keys(params).forEach(function (paramName) {
                if (paramName == "sort") {
                    let keyValues = params[paramName];
                    if (Array.isArray(keyValues)) {
                        for (let key of keyValues) {
                            let values = key.split(',');
                            let descendant = (values.length > 1) && (values[1] == "desc");
                            sortKeys.push({ key: values[0], asc: !descendant });
                        }
                    } else {
                        let value = keyValues.split(',');
                        let descendant = (value.length > 1) && (value[1] == "desc");
                        sortKeys.push({ key: value[0], asc: !descendant });
                    }
                } else {
                    // todo add search key
                    if (paramName in model)
                        searchKeys.push({ key: paramName, value: params[paramName] });
                }
            });

            searchKeys;
            sortKeys;
            filteredAndSortedObjects = objectsList;
            if (Object.keys(sortKeys).length > 0) {
                sortKeys.forEach(element => {
                    let des = 1;
                    if (element.asc == false) {
                        des = -1;
                    }
                    /*switch (element.key)
                    {
                       case "Title": {  filteredAndSortedObjects= filteredAndSortedObjects.sort((a, b) =>
                        SortByName(a,element.key)> SortByName(b,element.key) ? des : des*-1);
                        
                          break; }
                       case "Id"  :{filteredAndSortedObjects= filteredAndSortedObjects.sort((a, b) => a.Id > b.Id ? des : des*-1); break;}
                       case "Category":{ filteredAndSortedObjects= filteredAndSortedObjects.sort((a, b) => a.Category > b.Category ? des : des*-1);break; }
                       case "Url" :{ filteredAndSortedObjects= filteredAndSortedObjects.sort((a, b) => a.Url > b.Url ? des : des*-1); break;}
                   
                    }*/
                    filteredAndSortedObjects = filteredAndSortedObjects.sort((a, b) =>
                        SortByName(a, element.key) > SortByName(b, element.key) ?
                            des : des * -1);
                });
                // filteredAndSortedObjects= filteredAndSortedObjects.sort((a, b) => a.Title > b.Title ? 1 : -1);

                searchKeys.forEach(key => {
                    filteredAndSortedObjects = filterByName1(filteredAndSortedObjects, key);

                });

                return filteredAndSortedObjects;

            }
            //
            // todo filter
            filterByName1(filteredAndSortedObjects, searchKeys);
            if (Object.keys(searchKeys).length > 0) {



            }

            return filteredAndSortedObjects;
        }
        return objectsList;
    }

    /*
    getAll(params = null) {
        let objectsList = this.objects();
        if (this.bindExtraDataMethod != null) {
            objectsList = this.bindExtraData(objectsList);
        }
        if (params) {
            let model = this.model;
            let filteredAndSortedObject = [];
            let sortKeys = [];
            let searchKeys = [];
            Object.keys(params).forEach(function (paramName) {
                if (paramName == "sort") {
                    
                    let keyValues = params[paramName];
                    if (Array.isArray(keyValues)) {
                        for (let key of keyValues) {
                            let values = key.split(',');
                            let descendant = (values.length > 1) && (values[1] == "desc");
                            sortKeys.push({ key: values[0], asc: !descendant });
                        }
                    } else {
                        let value = keyValues.split(',');
                        let ascendant = (value.length > 1) && (value[1] == "desc");
                        sortKeys.push({ key: value[0], asc: ascendant });
                    }
                } else {
                    // todo add search key
                    if(paramName in model)
                    {
                    searchKeys.push({key: paramName,value: params[paramName]});
                    }
                }
            });
            // todo filter
            // todo sort
            return filteredAndSortedObject;
        
    }

            // TODO Laboratoire 2
        
        return objectsList;
    }
    get(id) {
        for (let object of this.objects()) {
            if (object.Id === id) {
                if (this.bindExtraDataMethod != null)
                    return this.bindExtraDataMethod(object);
                else
                    return object;
            }
        }
        return null;
    }
    removeByIndex(indexToDelete) {
        if (indexToDelete.length > 0) {
            utilities.deleteByIndex(this.objects(), indexToDelete);
            this.write();
        }
    }
    findByField(fieldName, value, excludedId = 0) {
        if (fieldName) {
            let index = 0;
            for (let object of this.objects()) {
                try {
                    if (object[fieldName] === value) {
                        if (object.Id != excludedId)
                            return this.objectsList[index];
                    }
                    index++;
                } catch (error) {
                    break;
                }
            }
        }
        return null;
    }
    */
}


//petite function qui retour l'a valeur dont la clef de l'objet en entre dans le sort
function SortByName(object1, Sort) {


    let sortie;
    Object.keys(object1).forEach(element => {
        if (element == Sort) {

            sortie = object1[element];

        }

    });
    return sortie;
}

function filterByName1(object1, Sort, name) {
    Sort.value = Sort.value.replace("\n", "");

    let searchType = 0;
    if (Sort.value.length != 0) {

        if (Sort.value[0] == "*") { 
            Sort.value =   Sort.value.replace("*","");  
            searchType +=2;
        }

        if (Sort.value[Sort.value.length - 1] == "*") {
            searchType ++;
            Sort.value =   Sort.value.replace("*","");  
            
        }
        Sort.value = Sort.value.toLowerCase();
    }
    

    let sortie = [];
    object1.forEach(element => {
        Object.keys(element).forEach(e => {
            if (e == Sort.key) {
                let LenghtSearth = element[e].length;
                let lengthSort = Sort.value.length;
                element[e] = element[e].toString();
                
        if(element[e].toLowerCase() == Sort.value)
        {sortie.push(element);}
        else {
                switch (searchType) {
                    
                    

                    case 3:{ //equal value  *value*
                        if(element[e].toLowerCase().includes(Sort.value))
                            {
                            sortie.push(element);
                        }break};
                    case 2:{ // equal value  value*
                        let check =element[e].slice(LenghtSearth - lengthSort, LenghtSearth);
                        if (Sort.value ==check.toLowerCase() ) {
                            sortie.push(element);
                        }break};
                    case 1:{ //equal value * 
                        let check = element[e].slice(0, Sort.value.length);
                     if (Sort.value == check.toLowerCase()){
                        sortie.push(element);
                        }break;};

 

                }
            }

                
                

                
                


            }
        });
    });
    return sortie;
}

module.exports = Repository;