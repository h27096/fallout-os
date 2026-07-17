function boot(){

    document.getElementById("output").innerHTML =
    "BOOTING FALLOUT OS...<br><br>" +
    "WELCOME VAULT DWELLER.<br><br>" +
    "ROBCO TERMINAL READY.";

}


function runCommand(){

    let command = document.getElementById("command").value.toUpperCase();

    let output = document.getElementById("output");

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

    else if(command == "VAULT"){

        output.innerHTML +=
        "<br><br>VAULT DATABASE:<br>" +
        "VAULT 101 - OPERATIONAL<br>" +
        "VAULT 111 - CRYOGENIC LAB<br>" +
        "VAULT 87 - CLASSIFIED";

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
