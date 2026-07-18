let overseerMode = false;
let waitingForPassword = false;
let failedAttempts = 0;

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

    printLine("INITIALIZING POWER.............[OK]", 1200);

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

    if(command == "COLDWAKE"){

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
    if(command == "HELP"){

        output.innerHTML += 
        "<br><br>AVAILABLE COMMANDS:<br>" +
        "HELP<br>" +
        "STATUS<br>" +
        "VAULT<br>" +
        "CLEAR";

    }

    else if(command == "STATUS"){

        output.innerHTML +=
        "<br><br>SYSTEM STATUS:<br>" +
        "CPU: ONLINE<br>" +
        "MEMORY: OK<br>" +
        "SECURITY: ACTIVE";

    }
        
else if(command == "OVERSEER"){

    output.innerHTML +=
    "<br><br>OVERSEER TERMINAL DETECTED" +
    "<br>ENTER AUTHORIZATION CODE:";

    waitingForPassword = true;

}
    
    else if(command == "VAULT"){

        output.innerHTML +=
        "<br><br>VAULT DATABASE:<br>" +
        "VAULT 81 - OPERATIONAL<br>" +
        "VAULT 111 - CRYOGENIC LAB<br>" +
        "VAULT 88 - HIGHLY CLASSIFIED";

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

    else if(command == "CLEAR"){

        output.innerHTML = "";

    }

    else{

        output.innerHTML +=
        "<br><br>UNKNOWN COMMAND.";

    }

    document.getElementById("command").value="";

}
