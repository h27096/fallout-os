const bootText = document.getElementById("boot-text");
const cursor = document.getElementById("cursor");

const bootLines = [
"ROBCO INDUSTRIES (TM)",
"UNIFIED OPERATING SYSTEM",
"",
"COPYRIGHT 2075-2077 ROBCO INDUSTRIES",
"",
"Initializing RobCo Systems...",
"Loading Vault-Tec Modules...",
"Checking Memory...",
"Loading Terminal Services...",
"Loading Holotape Drivers...",
"Connecting Pip-Boy Interface...",
"Initializing Security Protocols...",
"",
"SYSTEM READY"
];

let line = 0;

function typeLine(){

    if(line < bootLines.length){

        bootText.innerHTML += bootLines[line] + "\n";

        line++;

        setTimeout(typeLine,400);

    }else{

        setTimeout(()=>{
            // Later we'll transition to the login screen here.
            alert("Boot Complete");
        },1200);

    }

}

typeLine();
