const bootText = document.getElementById("boot-text");

const lines = bootText.innerText.split("\n");

bootText.innerText = "";

let i = 0;

function typeLine(){

    if(i < lines.length){

        bootText.innerHTML += lines[i] + "<br>";

        window.scrollTo(0,document.body.scrollHeight);

        i++;

        setTimeout(typeLine,400);

    }else{

        setTimeout(()=>{
            alert("Boot Complete\n\nVersion 0.1.0");
        },1000);

    }

}

typeLine();
