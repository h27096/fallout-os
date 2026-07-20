let personalLogs = JSON.parse(localStorage.getItem("vaultLogs")) || [];
let writingLog = false;
let overseerMode = false;
let waitingForPassword = false;
let failedAttempts = 0;
let lockdownActive = false;

function printLine(text, delay) {

    setTimeout(function () {

        document.getElementById("output").innerHTML += text + "<br>";

    }, delay);

}

function boot() {

    document.getElementById("output").innerHTML = "";

    document.getElementById("command").disabled = true;
    document.getElementById("executeButton").disabled = true;

    printLine("ROBCO INDUSTRIES (TM) TERMLINK", 0);

    printLine("", 600);

    printLine("INITIALIZING POWER............[OK]", 1200);

    printLine("CHECKING MEMORY...............[OK]", 2200);

    printLine("CONNECTING TO VAULT DATABASE..[OK]", 3200);

    printLine("LOADING SECURITY..............[OK]", 4200);

    printLine("VERIFYING PIP-BOY CONNECTION..[OK]", 5000);

    printLine("ALL SYSTEMS ONLINE", 5000);

    printLine("WELCOME VAULT DWELLER.", 5600);

    printLine("ROBCO TERMINAL READY.", 6400);

    setTimeout(function () {

        document.getElementById("command").disabled = false;
        document.getElementById("executeButton").disabled = false;

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

function launchBrowser(){

    document.getElementById("terminalScreen").style.display = "none";

    document.getElementById("browserScreen").style.display = "block";

}

function browserCommand(){

    let command = document.getElementById("browserCommand").value.toUpperCase();

    let browserOutput = document.getElementById("browserOutput");


    if(command == "HOME"){

        browserOutput.innerHTML =
        "ROBCO VAULTNET HOME<br><br>" +
        "AVAILABLE LOCATIONS:<br>" +
        "VAULTNET://PERSONNEL<br>" +
        "VAULTNET://REACTOR<br>" +
        "VAULTNET://LOGS";

    }


    else if(command == "EXIT"){

        document.getElementById("browserScreen").style.display = "none";

        document.getElementById("terminalScreen").style.display = "block";

    }


    else{

        browserOutput.innerHTML +=
        "<br><br>PAGE NOT FOUND.";

    }


    document.getElementById("browserCommand").value = "";

}
