
const interval = 2500                      // how much time it takes before a new language is selected from the google manu in ms(milliseconds), if you have slower internet connection use bigger interval
let abbreviationsToLanguage = null         // object extracted from the languages.json file
let abbreviationsToLanguageLength = 0      // the number of language objects from the language.json file
let fileTypes = ['xml']                    // acceptable file types
let xmlStringData = ""                     // the xml string data extracted from the XML file "<resources><string name="example_name">Hello World!</string></resources>"
let xmlDoc = null                          // the xml DOM element parsed using the DOMParser

let googleLanguageMenuDOMNames = []        // array with the language names from the google menu  ["Afrikaans", "Albanian", "Amharic",..]
let googleLanguageMenuDOM = []             // HTMLCollection array with the google DOM menu elements

let json = null                            // object holding the converted XML to JSON data {resources: {string:[{_name: "example_name", __text: "Hello World!" }]}}
let languageJSONs = []                     // array with all object copy of the 'json' object, but have different '__text' value, depending on the selected languages to which the original json object will be converted
let lanaguageNames = []                    // array with the names of the languages that are selected by the user using the checkboxes ["Bulgarian", "Italian", "Japanese",...]
let checkedCheckboxesIds = []              // array with ids of the selected language checkboxes by the user ['bg', 'it', 'ja',...]
let progressBarAnimationHandler = null     // a handler for the progress bar interval, that is cleared after the animation has finished 
let timeoutHandlers = []                   // array with all the handlers, that call the method for generating the a copy of the original 'json' object with the translated values for each language
let numberOf100msLoops = 0                 // how many time the function for the progress bar was called, used to update the percetage of the progress bar

$(document).ready(function () {

    /**
     * Function called when the user clicks over the <input> button responsible for
     * loading the xml file
     */
    $("input[type=file]").click(function () {

        // rset the value, that way we can choose the same file
        $(this).val("");
    })

    /**
    * Function calles when the file for the <input> button, changes afrer the user
    * select a xml file, that will be opened.
    */
    $("input[type=file]").change(function () {
        fileInputOnChange(this)
    })

    /**
     * Function calles when a checkbox is clicked
     */
    $("input[type=checkbox]").click(function () {
        checkboxStateChange(this)
    })

    $.getJSON("./json/languages.json", function (json) {
        abbreviationsToLanguage = json
        abbreviationsToLanguageLength = Object.keys(abbreviationsToLanguage).length
        addLanguageCheckboxes()
        disableAllLanguagesCheckboxes()
    })

    // reset the selected language
    setTimeout(() => { resetSelectedLanguage() }, 2000)

    // disable the google top toolbar
    document.getElementById(':2.container').classList.add("disabledbutton")
})

/**
 * Function called when a checkbox state is changed by the user.
 * @param {Event} event
 */
function checkboxStateChange(e) {

    const c = getAllCheckedCheckboxesIds().length

    // if the 'Select All' checkbox is clicked
    if ($(e).attr('id') == "selectAll") {
        if ($(e).is(":checked")) selectAllLanguagesCheckboxes()
        else deselectAllLanguagesCheckboxes()
    } else {
 
        // deselect the 'Select All' checkbox
        if (!e.srcElement.checked) {
            $('#selectAll').prop('checked', false)
        } else {
            if (c + 1 == abbreviationsToLanguageLength) {
                $('#selectAll').prop('checked', true)
            }
        }
    }

    if (c == 0) {
        $('#downloadButton').prop('disabled', true)
    } else {
        $('#downloadButton').prop('disabled', false)
    }
}

/**
 * Function generates the language checkboxes, and adds them to the 'languageBox' DOM
 * element, all generated checkboxes have the following code:
 * 
 * <div class="cards">
 *    <div class="form-check">
 *         <input class="form-check-input" type="checkbox" value="" id="en"
 *                  onclick="onCheckboxStateChange(this);" disabled>
 *         <label class="form-check-label" for="en" >
 *             English (English)
 *         </label>
 *    </div>
 * </div>
 */
function addLanguageCheckboxes() {
    if (!abbreviationsToLanguage) return

    const languagesBox = document.getElementById('languagesBox')
    Object.entries(abbreviationsToLanguage).forEach(([key, val]) => {

        const div1 = document.createElement('div')
        div1.className = "cards"

        const div2 = document.createElement('div')
        div2.className = "form-check"

        const input = document.createElement('input')
        input.className = "form-check-input"
        input.type = "checkbox"
        input.id = key
        input.onchange = checkboxStateChange
        if (key == 'en') {
            input.setAttribute("disabled", true)
        }

        const label = document.createElement('label')
        label.className = "form-check-label"
        label.setAttribute("for", key)
        label.innerHTML = val.displayName
        if (key == 'en') {
            label.setAttribute("style", "text-decoration: line-through;")
        }

        div2.appendChild(input)
        div2.appendChild(label)
        div1.appendChild(div2)
        languagesBox.appendChild(div1)
    })
}


/**
 * Function that resets the language to the default english, this prevents problem
 * if a language is already selected, and we try to change to the same language.
 */
function resetSelectedLanguage() {

    // click the restore and cancel buttons from the Google container
    let container = document.getElementById(':2.container')
    if (container) {

        let restoreButton = container.contentWindow.document.getElementById(':2.restore')
        if (restoreButton) restoreButton.click()

        let cancelButton = container.contentWindow.document.getElementById(':2.cancel')
        if (cancelButton) cancelButton.click()
    }

    selectEnglishLanguage()
}

/**
 * Function fot the Google Translate Element
 */
function googleTranslateElementInit() {

    new google.translate.TranslateElement(
        {
            pageLanguage: 'en',
            layout: google.translate.TranslateElement.InlineLayout.SIMPLE
        }, 'google_translate_element');
}

/**
 * Method called when the user select new XML file from the file manager
 * @param {DOM Element} e the input DOM element 
 */
function fileInputOnChange(e) {
    if (!e.files || !e.files[0]) return

    const extension = e.files[0].name.split('.').pop().toLowerCase()   // file extension from input file
    const isSuccess = fileTypes.indexOf(extension) > -1                // is extension in acceptable types

    if (isSuccess) {

        const reader = new FileReader()
        reader.onload = function (e) {
            xmlStringData = e.target.result
            setElementsFromData()
        }
        reader.readAsText(e.files[0])

        $("#xmlImage").css("display", "visible")
        $("#xmlText").css("display", "visible").html(e.files[0].name)
    }
    else {
        $("#errorMsg").collapse('show')
    }
}

/**
 * Function that is called, when the user clicks the 'Open File' buttons, instead of having a input
 * element in out HTML page, that cannot be customize, we create it each time the function is called.
 */
function openFile() {
    resetSelectedLanguage()
    $("#fileInput").trigger("click");
}

/**
 * Function that creates the <label> DOM element inside the document, but they are put inside a paragraf
 * and have a font-size=0, that way they kept their visibility, but are practically invisible!
 * The element have a 'id' that matches the name attribute of the xml elements and, have a 'innerHTML' that
 * matches the value of the xml string value.
 */
function setElementsFromData() {

    $('#successMsg').collapse('hide')
    $('#selectAll').prop('checked', false);
    progressBarSetValue(0)
    enableAllLanguagesCheckboxes()
    //deselectAllLanguagesCheckboxes()

    // we need DOM parser, for parsing the XML string data
    if (window.DOMParser) {

        // conver the xml DOM element to its matching JSON object
        const parser = new DOMParser();
        xmlDoc = parser.parseFromString(xmlStringData, "text/xml");
        json = new X2JS().xml2json(xmlDoc)

        // clear the paragraph where the created <label> DOM elements are attached
        $("#elementsHolderBox").html("")


        // create the <label> DOM elements using the json object
        const strings = json.resources.string
        for (let i = 0; i < strings.length; i++) {

            // get the name and text value for <string name="example_name">Hello World!</string>
            // the values are name="example_name" and text="Hello World!"
            let stringValue = strings[i]
            let name = stringValue._name
            let text = stringValue.__text

            if (name != null && text != null) {

                // create a <label> DOM element and attach it to the paragraph
                const element = document.createElement("label");
                element.innerHTML = text
                element.id = name
                elementsHolderBox.appendChild(element);
            }
        }
    }
}


/**
 * Function that gets the language names from the Google language menu
 */
function getLanguagesNames() {
    if (googleLanguageMenuDOMNames.length > 0) googleLanguageMenuDOMNames = []

    // get all iframe elements
    let iframes = document.getElementsByTagName('iframe')
    for (let i = 0; i < iframes.length; i++) {

        let contentWindow = iframes[i].contentWindow
        if (contentWindow != null) {

            // get the menu with the elements
            let menu = contentWindow.document.getElementsByClassName("goog-te-menu2-item")
            if (menu != null && menu.length > 10) {

                for (let j = 0; j < menu.length; j++) {
                    let text = menu[j].getElementsByClassName("text")[0]
                    googleLanguageMenuDOMNames.push(text.innerHTML)
                }
                googleLanguageMenuDOM = menu
            }
        }
    }
}

/**
 * Function that gets json object that is copy of the original 'json' object, but
 * it changes the '__text' to match the value of the translated <label> DOM element
 * @param {Number} lanaguageIndex index of the language that is currently selected
 * @returns copy of the original json object, with translated values
 */
function getLanguageJSON(lanaguageIndex) {

    const abbreviation = checkedCheckboxesIds[lanaguageIndex]
    const jsonClone = JSON.parse(JSON.stringify(json))
    const elementsHolderBox = document.getElementById("elementsHolderBox")
    const childrens = elementsHolderBox.children
    for (let i = 0; i < childrens.length; i++) {

        // example if we have the label DOM element <label id="example_name"><div...>Здравей свят!</div></label>
        const childDOM = getLastChild(childrens[i])
        const translatedName = childrens[i].id       // "example_name"
        const translatedText = childDOM.innerHTML    // "Здравей свят!"

        // we have the original {resources: {string:[{_name: "example_name", __text: "Hello World!" }]}}
        const originalName = jsonClone.resources.string[i]._name  // "example_name"
        const originalText = jsonClone.resources.string[i].__text // "Hello World!"

        // make sure we have matching name, in case something went wrong
        if (originalName == translatedName) {
            jsonClone.resources.string[i].__text = capitalizeSentence(originalText, translatedText, abbreviation)
        }
    }
    return jsonClone
}

/**
 * Function that capitalize the first letters in sentences, since sometime the google
 * translate does not capitalize it correctly
 * @param {String} originalString the original string from the opened strings.xml file that is in english
 * @param {String} translatedString the translated string from the original in different language
 * @param {String} language language to which the original string was translated
 * @returns 
 */
function capitalizeSentence(originalString, translatedString, language) {

    const splitOriginalString = originalString.split(' ')
    const splitTranslatedString = translatedString.split(' ')

    // if the first letter of each word of the original string is capital, then we need to capitalize the translation too
    // For example (en)[Import Image] is trnaslated to (fr)[Importer une image], and the number of words does not match
    // Google can`t tell which word should be capitalized, it doest that only to the first word!!
    let shouldCapitalize = true
    for (let i = 0; i < splitOriginalString.length; i++) {
        let originalStringFirstLetter = splitOriginalString[i][0]
        if (originalStringFirstLetter != capitalizeFirstLetter(originalStringFirstLetter, language)) {
            shouldCapitalize = false
        }
    }

    if (shouldCapitalize) {

        // capitalize each word
        for (let i = 0; i < splitTranslatedString.length; i++) {
            splitTranslatedString[i] = capitalizeFirstLetter(splitTranslatedString[i], language)
        }
    }

    return splitTranslatedString.join(' ')
}

/**
 * Function for changing the current language, with included check
 * @param {Number} i index of the language
 */
function changeLanguageWithCheck(i) {

    let languageName = lanaguageNames[i]
    let index = googleLanguageMenuDOMNames.indexOf(languageName)
    console.log(i + "  --  " + index + " ==== " + googleLanguageMenuDOMNames[index])

    if (index != -1) {
        changeLanguage(index)
    } else {
        console.error("error at index" + index)
    }
}

/**
 * Function that generates the translated value by changing the selected language from the Google menu.
 * And then extracting the translated values from the <label> Dom element and putting them in to separate
 * json objects.
 */
function generateLanguages() {
    getLanguagesNames()

    // get with how much to increase the progressbar loading percentage values each 100ms
    const progressbarPercentagePerLanguage = 100 / lanaguageNames.length
    const progressbarPercentagePer100ms = progressbarPercentagePerLanguage / (interval / 100)
    numberOf100msLoops = 0

    timeoutHandlers = []
    languageJSONs = []
    changeLanguageWithCheck(0)

    for (let i = 0; i < lanaguageNames.length; i++) {

        // for each language generate a timeout that will invoke a function after the time have passed
        // that way we let the google server time, to translate all fields inside the page
        const handler = setTimeout(() => {

            const languageJSON = getLanguageJSON(i)
            languageJSONs.push(languageJSON)
            //console.log(JSON.stringify(languageJSON))

            // if we have not reached the last language
            if (i < lanaguageNames.length - 1) {
                getLanguagesNames()
                changeLanguageWithCheck(i + 1)
            } else {

                // reset the language to the original, and save the zip file
                saveZip()
                cancel(true)
            }

        }, interval * (i + 1))

        timeoutHandlers.push(handler)
    }

    // generate a interval that will call a function every 100ms, used to update the progressbar
    clearInterval(progressBarAnimationHandler)
    progressBarAnimationHandler = setInterval(() => {

        // update the number of how many times this function was called
        numberOf100msLoops++
        const progressbarPercentage = (numberOf100msLoops * progressbarPercentagePer100ms) | 0

        // update the progressbar percentage value
        if (progressbarPercentage >= 100) {
            progressBarSetValue(100)
            clearInterval(progressBarAnimationHandler)
        } else {
            progressBarSetValue(progressbarPercentage)
        }

    }, 100)

}

/**
 * Function that cancels the download proccess 
 */
function cancel(showSuccessMsg) {

    if (showSuccessMsg) $('#successMsg').collapse('show')
    else $('#successMsg').collapse('hide')

    $("#downloadButton").css("display", "visible").prop('disabled', false)
    $("#cancelButton").css("display", "none")
    $('#progressbarBox').collapse('hide').css("display", "none")

    progressBarSetValue(0)
    resetSelectedLanguage()
    enableAllLanguagesCheckboxes()
    for (let i = 0; i < timeoutHandlers.length; i++) {
        clearTimeout(timeoutHandlers[i])
    }
    clearInterval(progressBarAnimationHandler)
}

/**
 * Function that returns array with ids of all checked checkboxes
 * @returns array list with the ids of all checked checkboxes
 */
function getAllCheckedCheckboxesIds() {

    // get the abbreviations ids of the checked language checkboxes ['bg', 'en', 'ja',..]
    const ids = []
    const languagesBox = document.getElementById("languagesBox")
    const checkboxes = languagesBox.getElementsByClassName("form-check-input")
    for (let i = 0; i < checkboxes.length; i++) {
        const child = checkboxes[i]
        if (child.checked) {
            ids.push(child.id)
        }
    }
    return ids
}

/**
 * Function that start the download proccess 
 */
function download() {

    checkedCheckboxesIds = getAllCheckedCheckboxesIds()
    if (checkedCheckboxesIds.length == 0) return

    let container = document.getElementById(':2.container')
    if (container) container.classList.add("disabledbutton")

    $('#successMsg').collapse('hide')
    $("#downloadButton").css("display", "none")
    $("#cancelButton").css("display", "visible")

    // show progressbar and disable download button
    $('#progressbarBox').collapse('show').css("display", "visible")
    $('#downloadButton').prop('disabled', true)

    // reset the language to EN(english)
    resetSelectedLanguage()
    disableAllLanguagesCheckboxes()


    // set timeout, since the language was reset back to default EN(english)
    setTimeout(() => {

        getLanguagesNames()

        // get the array with the language names corresponding to the ids  ["Bulgarian", "English", "Japanese",...]
        if (lanaguageNames.length > 0) lanaguageNames = []
        for (let i = 0; i < checkedCheckboxesIds.length; i++) {

            // get the abreviation id and the google name
            const abbreviationsId = checkedCheckboxesIds[i]
            const languageName = abbreviationsToLanguage[abbreviationsId].googleName

            if (languageName != null) {
                lanaguageNames.push(languageName)
            }
        }

        // change the first language
        changeLanguageWithCheck(0)

        // imediatly after the change of the first language click the "Confirm" google button
        let container = document.getElementById(':2.container')
        if (container) {
            let confirmButton = container.contentWindow.document.getElementById(':2.confirm')
            if (confirmButton) confirmButton.click()
        }

        // now generate the rest of the languages
        generateLanguages()

    }, interval)
}

/**
 * Function that generates a ZIP file, and puts the translated JSON file in a separate folder,
 * that matche the language abbreviations ['en', 'bg', 'fr', 'ja',...] fr that particular object
 */
function saveZip() {

    // using the zipJS library
    const zip = new JSZip();
    for (let i = 0; i < languageJSONs.length; i++) {

        const json = languageJSONs[i]
        let xmlString = new X2JS().json2xml_str(json)
        xmlString = xmlString.replaceAll("&apos;", "'")

        const abbreviation = checkedCheckboxesIds[i]
        const folder = zip.folder(abbreviation)
        folder.file("strings.xml", beautify(xmlString));
    }

    // save the zip file
    zip.generateAsync({ type: "blob" }).then(function (content) {

        // using the fileSaverJS library
        saveAs(content, "example.zip");
    });
}

/**
 * Function that changes the current value of the progressbar
 * @param {Number} progressbarPercentage the new percentage value of the progressbar in range [0,100]
 */
function progressBarSetValue(progressbarPercentage) {
    $('#progressbar').
        attr("aria-valuenow", progressbarPercentage).
        width(progressbarPercentage + '%').
        html(progressbarPercentage + '%');
}

function getLastChild(element) {
    if (element.children.length > 0) {
        return getLastChild(element.lastChild)
    } else {
        return element
    }
}

/**
 * Functiont that change the selected language, by invoking a click for a particular DOM
 * element from the Google language menu
 * @param {Number} i index of the language element from the Google language menu 
 */
function changeLanguage(i) {
    if (!googleLanguageMenuDOM) return
    googleLanguageMenuDOM[i].click()
}

/**
 * If for example the selected language is Bulgarian, and we try to translate from English and
 * we choose Bulgarian, it will not translate it, since the language is already selected.
 */
function selectEnglishLanguage() {
    getLanguagesNames()

    const englishLanguageIndex = googleLanguageMenuDOMNames.indexOf("English")
    if (englishLanguageIndex != -1) {
        changeLanguage(englishLanguageIndex)
    }
}

const capitalizeFirstLetter = ([first, ...rest], locale = navigator.language) =>
    first.toLocaleUpperCase(locale) + rest.join('')

function collapseSuccessMsg() {
    $("#successMsg").collapse('hide')
}


function deselectAllLanguagesCheckboxes() {
    changeSelectionForAllLanguages(false)
}

function selectAllLanguagesCheckboxes() {
    changeSelectionForAllLanguages(true)
}

function changeSelectionForAllLanguages(select) {
    $(".form-check-input").each(function () {
        if ($(this).attr('id') != "en") $(this).prop('checked', select)
    })
}

function disableAllLanguagesCheckboxes() {
    changeDisableEnableForAllLanguages(true)
    $('#selectAll').attr('disabled', true)
}

function enableAllLanguagesCheckboxes() {
    changeDisableEnableForAllLanguages(false)
    $('#selectAll').attr('disabled', false)
}

function changeDisableEnableForAllLanguages(disable) {
    $(".form-check-input").each(function () {
        if ($(this).attr('id') != "en") $(this).attr('disabled', disable)
    })
}


