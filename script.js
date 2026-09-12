let personalLogs = JSON.parse(localStorage.getItem("vaultLogs")) || [];
let writingLog = false;
let overseerMode = false;
let waitingForPassword = false;
let failedAttempts = 0;
let lockdownActive = false;

function boot() {
    document.getElementById("startupScreen").style.display = "none";
    document.getElementById("desktopScreen").style.display = "none";
    document.getElementById("browserWindow").style.display = "none";
    document.getElementById("bootScreen").style.display = "block";
    document.getElementById("bootOutput").innerHTML = "";
    document.getElementById("command").disabled = true;
    document.getElementById("executeButton").disabled = true;

    const lines = [
        ["ROBCO INDUSTRIES (TM) TERMLINK", 0],
        ["", 600],
        ["INITIALIZING POWER............[OK]", 1200],
        ["CHECKING MEMORY...............[OK]", 2200],
        ["CONNECTING TO VAULT DATABASE..[OK]", 3200],
        ["LOADING SECURITY..............[OK]", 4200],
        ["VERIFYING PIP-BOY CONNECTION..[OK]", 5000],
        ["ALL SYSTEMS ONLINE", 5400],
        ["WELCOME VAULT DWELLER.", 6000],
        ["ROBCO TERMINAL READY.", 6600]
    ];

    lines.forEach(function(item) {
        setTimeout(function() {
            document.getElementById("bootOutput").innerHTML += item[0] + "<br>";
        }, item[1]);
    });

    setTimeout(function() {
        document.getElementById("bootScreen").style.display = "none";
        document.getElementById("desktopScreen").style.display = "block";
        document.getElementById("command").disabled = false;
        document.getElementById("executeButton").disabled = false;
        document.getElementById("command").focus();
    }, 7000);
}

function runCommand(){

    let command = document.getElementById("command").value.toUpperCase();

    let output = document.getElementById("output");

    if(waitingForPassword){

    if(command == "PASSWORD"){

        output.innerHTML +=
        "<br><br>VERIFYING..." +
        "<br><br>ACCESS GRANTED" +
        "<br>WELCOME, OVERSEER.";

        overseerMode = true;
        waitingForPassword = false;
        failedAttempts = 0;

    }

    else{

        failedAttempts++;

        output.innerHTML +=
        "<br><br>ACCESS DENIED";

        if(failedAttempts >= 3){

            output.innerHTML +=
            "<br><br>TERMINAL LOCKED" +
            "<br>PLEASE WAIT 10 SECONDS...";

            document.getElementById("command").disabled = true;
            document.getElementById("executeButton").disabled = true;

            setTimeout(function(){

                failedAttempts = 0;

                document.getElementById("command").disabled = false;
                document.getElementById("executeButton").disabled = false;

                output.innerHTML +=
                "<br><br>LOCK REMOVED.";

            },10000);

        }

        else{

            output.innerHTML +=
            "<br>" + (3 - failedAttempts) + " ATTEMPTS REMAINING";

        }

    }

    document.getElementById("command").value = "";

    return;

}

if(writingLog){

    personalLogs.push(command);

    localStorage.setItem(
        "vaultLogs",
        JSON.stringify(personalLogs)
    );

    output.innerHTML +=
    "<br><br>LOG SAVED.";

    writingLog = false;

    document.getElementById("command").value="";

    return;

}
        
else if(command == "HELP"){

    showHelp(output);

}

else if(command == "DIR"){

    output.innerHTML +=
    "<br><br>VAULT FILE DIRECTORY:" +
    "<br><br>SECURITY.DAT" +
    "<br>REACTOR.DAT" +
    "<br>OVERSEER.LOG";

  if(overseerMode){

    output.innerHTML +=
    "<br>CLASSIFIED.DAT" +
    "<br>EXPERIMENTS.DAT" +
    "<br>PERSONNEL.DAT";

}
}

    else if(command == "STATUS"){

        output.innerHTML +=
        "<br><br>SYSTEM STATUS:<br>" +
        "CPU: ONLINE<br>" +
        "MEMORY: OK<br>" +
        "SECURITY: ACTIVE";
      
        if(lockdownActive){

    output.innerHTML +=
    "<br>VAULT STATUS: LOCKDOWN ACTIVE";

}

else{

    output.innerHTML +=
    "<br>VAULT STATUS: NORMAL";

}

    }
        
else if(command == "OVERSEER"){

    output.innerHTML +=
    "<br><br>OVERSEER TERMINAL DETECTED" +
    "<br>ENTER AUTHORIZATION CODE:";

    waitingForPassword = true;

    console.log("Waiting for password:", waitingForPassword);

}
    
    else if(command == "VAULT"){

        output.innerHTML +=
        "<br><br>VAULT DATABASE:<br>" +
        "VAULT 81 - OPERATIONAL<br>" +
        "VAULT 111 - CRYOGENIC LAB<br>" +
        "VAULT 88 - HIGHLY CLASSIFIED";

    }

        else if(command == "SECURITY"){

    if(overseerMode){

        output.innerHTML +=
        "<br><br>SECURITY SYSTEMS:" +
        "<br>DOOR CONTROL: ONLINE" +
        "<br>CAMERAS: ACTIVE" +
        "<br>DEFENSE SYSTEMS: STANDBY";

    }

    else{

        output.innerHTML +=
        "<br><br>ACCESS DENIED.";

    }

}

else if(command == "WRITELOG"){

    if(overseerMode){

        output.innerHTML +=
        "<br><br>ENTER LOG TEXT:";

        writingLog = true;

    }

    else{

        output.innerHTML +=
        "<br><br>ACCESS DENIED.";

    }

}
            
else if(command == "LOGS"){

    if(overseerMode){

        output.innerHTML +=
        "<br><br>OVERSEER LOG DATABASE" +
        "<br><br>LOG 001:" +
        "<br>Vault operation began successfully." +
        "<br><br>LOG 002:" +
        "<br>Unknown events detected.";
if(personalLogs.length > 0){

    output.innerHTML +=
    "<br><br>PERSONAL OVERSEER LOGS:";

    for(let i = 0; i < personalLogs.length; i++){

        output.innerHTML +=
        "<br><br>LOG " + (i + 1) + ":" +
        "<br>" + personalLogs[i];

    }

}
        if(lockdownActive){

            output.innerHTML +=
            "<br><br>LOG 003:" +
            "<br>LOCKDOWN INITIATED BY OVERSEER." +
            "<br>SECURITY EVENT RECORDED.";

        }

    }

    else{

        output.innerHTML +=
        "<br><br>ACCESS DENIED.";

    }

}

                else if(command == "REACTOR"){

    if(overseerMode){

        output.innerHTML +=
        "<br><br>FUSION REACTOR STATUS" +
        "<br>POWER OUTPUT: 98%" +
        "<br>COOLANT: NORMAL" +
        "<br>CORE TEMP: STABLE";

    }

    else{

        output.innerHTML +=
        "<br><br>ACCESS DENIED.";

    }

}

                   else if(command == "LOCKDOWN"){

    if(overseerMode){

        lockdownActive = true;

        output.innerHTML +=
        "<br><br>VAULT SECURITY PROTOCOL INITIATED" +
        "<br><br>WARNING" +
        "<br>ALL DOORS SEALED" +
        "<br>SECURITY SYSTEMS ACTIVE" +
        "<br>LOCKDOWN STATUS: ACTIVE";

    }

    else{

        output.innerHTML +=
        "<br><br>ACCESS DENIED.";

    }

}
                       
  else if(command === "81"){

    output.innerHTML +=
    "<br><br>WELCOME VAULT 81 OVERSEER:<br>" +
    "ALL SYSTEMS ONLINE<br>" +
    "ALL OCCUPANTS OK<br>" +
    "SECRECT VAULT SECTION FOUND";

}

        else if(command === "2287"){

    output.innerHTML +=
    "<br><br>WELCOME VAULT 111 OVERSEER:<br>" +
    "ALL SYSTEMS FAILED<br>" +
    "ALL OCCUPANTS DEAD<br>" +
    "VAULT DOOR OPEN";

}

          else if(command.startsWith("OPEN ")){

    let file = command.replace("OPEN ", "");

    if(file == "SECURITY.DAT"){

        output.innerHTML +=
        "<br><br>SECURITY DATABASE:" +
        "<br><br>DOOR CONTROL: ONLINE" +
        "<br>CAMERAS: ACTIVE";

    }

    else if(file == "REACTOR.DAT"){

        output.innerHTML +=
        "<br><br>REACTOR DATABASE:" +
        "<br><br>POWER OUTPUT: 98%" +
        "<br>COOLANT: NORMAL" +
        "<br>CORE TEMP: STABLE";

    }

    else if(file == "CLASSIFIED.DAT"){

        if(overseerMode){

            output.innerHTML +=
            "<br><br>*** CLASSIFIED FILE ***" +
            "<br><br>PROJECT: FROST WATCH" +
            "<br>STATUS: ACTIVE" +
            "<br>CLEARANCE: OVERSEER";

        }

        else{

            output.innerHTML +=
            "<br><br>ACCESS DENIED.";

        }

    }

    else if(file == "EXPERIMENTS.DAT"){

        if(overseerMode){

            output.innerHTML +=
            "<br><br>EXPERIMENT DATABASE" +
            "<br><br>SUBJECT COUNT: 124" +
            "<br>ACTIVE TESTS: 3" +
            "<br>STATUS: CONFIDENTIAL";

        }

        else{

            output.innerHTML +=
            "<br><br>ACCESS DENIED.";

        }

    }

    else if(file == "PERSONNEL.DAT"){

        output.innerHTML +=
        "<br><br>VAULT PERSONNEL DATABASE" +
        "<br><br>ID 001: NATE" +
        "<br>STATUS: UNKNOWN" +
        "<br><br>ID 002: NORA" +
        "<br>STATUS: DECEASED" +
        "<br><br>ID 003: SHAUN" +
        "<br>STATUS: CLASSIFIED" +
        "<br><br>ID 004: SECURITY CHIEF" +
        "<br>STATUS: ACTIVE";

    }

    else{

        output.innerHTML +=
        "<br><br>FILE NOT FOUND.";

    }

}

              else if(command == "BROWSER"){

    launchBrowser();

}

    else if(command == "CLEAR"){

        output.innerHTML = "";

    }

    else{

        output.innerHTML +=
        "<br><br>UNKNOWN COMMAND.";

    }

    document.getElementById("command").value="";

}

function showHelp(output){

    if(overseerMode){

        output.innerHTML +=
        "<br><br>OVERSEER COMMANDS:<br>" +
        "HELP<br>" +
        "STATUS<br>" +
        "VAULT<br>" +
        "DIR<br>" +
        "OPEN<br>" +
        "LOGS<br>" +
        "WRITELOG<br>" +
        "SECURITY<br>" +
        "REACTOR<br>" +
        "LOCKDOWN<br>" +
        "BROWSER<br>" +
        "CLEAR";

    }

    else{

        output.innerHTML +=
        "<br><br>AVAILABLE COMMANDS:<br>" +
        "HELP<br>" +
        "STATUS<br>" +
        "VAULT<br>" +
        "DIR<br>" +
        "OPEN<br>" +
        "BROWSER<br>" +
        "CLEAR";

    }

}


const browserHistory = ["vaultnet://home"];
let browserHistoryIndex = 0;
let browserTimer;
let browserReturnFocus;
function launchBrowser() { openBrowser(); }
function openBrowser() {
    browserReturnFocus = document.activeElement;
    document.getElementById("browserWindow").style.display = "flex";
    if (!document.getElementById("browserAddress").value) renderBrowser();
    document.getElementById("browserAddress").focus();
}
function closeBrowser() {
    document.getElementById("browserWindow").style.display = "none";
    if (browserReturnFocus && !browserReturnFocus.disabled) browserReturnFocus.focus();
    else document.getElementById("command").focus();
}
function browserNavigate(value) {
    const address = value.trim();
    if (/^(home|vaultnet:\/\/home)$/i.test(address)) { browserHome(); return; }
    if (/^exit$/i.test(address)) { closeBrowser(); return; }
    try {
        if (!address || /\s/.test(address)) throw new Error("Invalid address");
        const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(address) ? address : "https://" + address);
        if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error("Unsupported address");
        addBrowserHistory(url.href);
    } catch {
        document.getElementById("browserStatus").textContent = "INVALID ADDRESS. Enter an HTTP or HTTPS website address.";
    }
}
function addBrowserHistory(address) {
    if (browserHistory[browserHistoryIndex] !== address) {
        browserHistory.splice(browserHistoryIndex + 1);
        browserHistory.push(address);
        browserHistoryIndex = browserHistory.length - 1;
    }
    renderBrowser();
}
function browserBack() {
    if (browserHistoryIndex > 0) { browserHistoryIndex--; renderBrowser(); }
}
function browserForward() {
    if (browserHistoryIndex < browserHistory.length - 1) { browserHistoryIndex++; renderBrowser(); }
}
function browserHome() { addBrowserHistory("vaultnet://home"); }
function browserReload() { renderBrowser(); }
function renderBrowser() {
    clearTimeout(browserTimer);
    const address = browserHistory[browserHistoryIndex];
    const home = address === "vaultnet://home";
    document.getElementById("browserAddress").value = address;
    document.getElementById("backButton").disabled = browserHistoryIndex === 0;
    document.getElementById("forwardButton").disabled = browserHistoryIndex === browserHistory.length - 1;
    document.getElementById("browserHome").hidden = !home;
    document.getElementById("browserFallback").hidden = home;
    const external = document.getElementById("openExternal");
    if (home) external.removeAttribute("href");
    else external.href = address;
    // A fresh frame reloads the entered address after any in-frame navigation.
    const oldFrame = document.getElementById("browserFrame");
    const frame = oldFrame.cloneNode(false);
    frame.removeAttribute("src");
    frame.hidden = home;
    oldFrame.replaceWith(frame);
    const status = document.getElementById("browserStatus");
    status.textContent = home ? "VAULTNET READY. ENTER A WEB ADDRESS." : "CONNECTING TO " + address;
    if (home) return;
    frame.addEventListener("load", function() {
        clearTimeout(browserTimer);
        // Blocked frames can fire load too; never report a guaranteed success.
        status.textContent = "ADDRESS REQUESTED. If the page is blank or refused, use OPEN IN NEW TAB.";
    });
    frame.addEventListener("error", function() {
        clearTimeout(browserTimer);
        status.textContent = "PAGE UNAVAILABLE HERE. Try OPEN IN NEW TAB.";
    });
    browserTimer = setTimeout(function() {
        status.textContent = "STILL WAITING? The site may be slow or block embedding. Try OPEN IN NEW TAB.";
    }, 10000);
    frame.src = address;
}
document.getElementById("addressForm").addEventListener("submit", function(event) {
    event.preventDefault();
    browserNavigate(document.getElementById("browserAddress").value);
});
document.getElementById("command").addEventListener("keydown", function(event) {
    if (event.key === "Enter" && !event.isComposing && !this.disabled) runCommand();
});
document.getElementById("browserWindow").addEventListener("keydown", function(event) {
    if (event.key === "Escape") closeBrowser();
});
