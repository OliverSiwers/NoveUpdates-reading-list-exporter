(async function () {
    const NOT_LOGGED_IN_ERROR = "You must be logged in to a novelupdates.com account use this extension";
    const UNKOWN_ERROR = "An unkown error occured. (The most likley reason is that you're not logged into a novelupdates.com account, but it could be something else.)";

    if (!location.href.match(/https:\/\/www.novelupdates.com/)) {
        alert("This extension only works if the active tab location is part of www.novelupdates.com (the forums don't work) and you are logged in to your Novel Updates account.");
        return;
    }

    async function getTagsAndNotes(sid) {
        return new Promise((resolve, reject) => {
            let req = new XMLHttpRequest();
            req.open("POST", "https://www.novelupdates.com/wp-admin/admin-ajax.php")

            formData = new FormData();
            formData.append("action", "wi_notestagsfic");
            formData.append("strSID", sid);

            req.onreadystatechange = () => {
                if (req.status != 200) {
                    reject(UNKOWN_ERROR);
                }

                if (req.readyState == XMLHttpRequest.DONE) {
                    const parsedResponse = JSON.parse(req.responseText.replace(/(?<=})\d+$/, ""));
                    const tags = parsedResponse.tags;
                    const notes = parsedResponse.notes;

                    resolve([tags, notes]);
                }
            };

            req.send(formData);
        });
    }

    async function getListItems(id, getNotes = true) {
        return new Promise(async (resolve, reject) => {
            let req = new XMLHttpRequest();
            req.open("GET", `https://www.novelupdates.com/reading-list/?list=${id}`);

            req.onreadystatechange = async () => {
                if (req.readyState == XMLHttpRequest.DONE) {

                    const doc = document.createElement("html");
                    doc.innerHTML = req.responseText;

                    if (doc.querySelector(".breadcrumb_nu+a")?.innerText == "logged in") {
                        reject(NOT_LOGGED_IN_ERROR);
                    }

                    const tbody = doc.querySelectorAll("[id='myTable read']>tbody>tr");

                    const listItems = [];

                    for (const tr of tbody) {
                        const attrs = tr.attributes;
                        const sid = attrs["data-sid"].value;
                        const title = attrs["data-title"].value;
                        const tags = attrs["data-tags"].value;
                        const score = attrs["data-rate"].value;

                        // console.log(tr.querySelector("td:nth-child(3)"));
                        const chapterStatus = tr.querySelector("td:nth-child(3)").innerText.trim();   
                        const chapterLink = tr.querySelector("td:nth-child(3)>a").href;

                        const letestChapter = tr.querySelector("td:nth-child(4)").innerText.trim();
                        const latestChapterLink = tr.querySelector("td:nth-child(4)>a").href;

                        const trObj = {
                            sid: sid,
                            title: title,
                            chapterStatus: chapterStatus,
                            chapterLink: chapterLink,
                            letestChapter: letestChapter,
                            latestChapterLink: latestChapterLink,
                        };

                        if (tags && tags != ",,") trObj["tags"] = tags;
                        if (score) trObj["score"] = score;

                        if (getNotes && attrs["data-notes"].value) {
                            const [tags, notes] = await getTagsAndNotes(sid);

                            trObj["notes"] = notes;
                            if (tags) trObj["tags"] = tags;
                        }

                        listItems.push(trObj);

                    }
                    resolve(listItems);
                }
            };

            req.send();
        });
    }

    async function getListOfLists(getItems = true) {
        return new Promise(async (resolve, reject) => {
            let req = new XMLHttpRequest();
            req.open("GET", `https://www.novelupdates.com/create-reading-lists`);

            req.onreadystatechange = async () => {
                if (req.readyState == XMLHttpRequest.DONE) {

                    const doc = document.createElement("html");
                    doc.innerHTML = req.responseText;

                    if (doc.querySelector(".mypage.read+a")?.innerText == "logged in") {
                        reject(NOT_LOGGED_IN_ERROR);
                    }

                    const tbody = doc.querySelectorAll("[id='myTable_crl']>tbody>tr");

                    const listOfLists = [];

                    for (const tr of tbody) {
                        const id = tr.querySelector("td:nth-child(1)>input").value;
                        const title = tr.querySelector("td:nth-child(2)>input").value;

                        console.log(id + ". " + title);

                        const description = tr.querySelector("td:nth-child(3)>input").value;
                        const icon = tr.querySelector("td:nth-child(4) [selected]").attributes["data-image"].value


                        const list = {
                            id: id,
                            title: title,
                            description: description,
                            icon: icon,
                        }

                        if (getItems)
                            list["items"] = await getListItems(id);

                        listOfLists.push(list);
                    }

                    resolve(listOfLists);
                }
            };

            req.send();
        });
    }

    function download(filename, text) {
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    }

    if (confirm("Do you want to export all your reading lists?")) {
        console.log("Getting lists...");
        try {
            let lists = await getListOfLists();
            download("novelupdates-" + new Date().toISOString().replace(/:|\./g, "_") + ".json", JSON.stringify(lists, null, "\t"));
            console.log("Done!");
        } catch (e) {
            alert("Failed to export list. Reason: " + e);
        }
    }

    // getListItems(0);
})();