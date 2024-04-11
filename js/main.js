var before = document.getElementById("before");
var liner = document.getElementById("liner");
var command = document.getElementById("typer");
var textarea = document.getElementById("texter");
var terminal = document.getElementById("terminal");

var git = 0;
var commands = [];

setTimeout(function() {
  loopLines(banner, "", 80);
  textarea.focus();
}, 100);

//init
textarea.value = "";
command.innerHTML = textarea.value;

window.addEventListener("keydown", function(e) {
  if (e.keyCode == 13) { // Enter key
    e.preventDefault(); // Prevent default to avoid any form submission
    const cmd = textarea.value.trim(); // Trim command
    commands.push(cmd);
    git = commands.length;
    addLine("visitor@website.com:~$ " + cmd, "no-animation", 0);
    commander(cmd); // Execute command
	command.innerHTML = "";
    textarea.value = ""; // Clear textarea after command execution
  } else if (e.keyCode == 38 && git > 0) { // Up arrow key
    git -= 1;
    textarea.value = commands[git];
  } else if (e.keyCode == 40 && git < commands.length) { // Down arrow key
    git += 1;
    textarea.value = commands[git] ? commands[git] : "";
  }
});

// Ensure typeIt function correctly reflects typing in textarea
function typeIt(e) {
  command.innerHTML = textarea.value; // Reflect typed value in command.innerHTML
}

function commander(cmd) {
  switch (cmd.toLowerCase()) {
    case "help":
      loopLines(help, "color2 margin", 80);
      break;
    case "whois":
      loopLines(whois, "color2 margin", 80);
      break;
    case "whoami":
      loopLines(whoami, "color2 margin", 80);
      break;
    case "socials":
      loopLines(socials, "color2 margin", 80);
      break;
    case "video":
        addLine("Nothing here yet...", "color2", 80);
        // newTab(youtube);
      break;
  case "sudo":
      addLine("Oh no, you're not admin...", "color2", 80);
      break;
  case "socials":
      loopLines(social, "color2 margin", 80);
      break;
  case "projects":
      loopLines(projects, "color2 margin", 80);
      break;
  case "history":
      addLine("<br>", "", 0);
      loopLines(commands, "color2", 80);
      addLine("<br>", "command", 80 * commands.length + 50);
      break;
  case "email":
      addLine('Nothing here yet...', "color2", 80);
      newTab(email);
      break;
  case "clear":
      setTimeout(function() {
        terminal.innerHTML = '<a id="before"></a>';
        before = document.getElementById("before");
      }, 1);
      break;
  case "banner":
      loopLines(banner, "", 80);
      break;
  case "contact":
      loopLines(contact, "color2 margin", 80);
      break;
    // socials
  case "blog":
      addLine("Nothing here yet...", "color2", 80);
    //  newTab(blog);
    break;
  case "youtube":
      addLine("Nothing here yet...", "color2", 80);
    //  newTab(youtube);
      break;
  case "medium":
      addLine("Nothing here yet...", "color2", 0);
    //  newTab(medium);
      break;
  case "linkedin":
      addLine("Nothing here yet...", "color2", 0);
    //  newTab(linkedin);
      break;
  case "twitter":
      addLine("Nothing here yet...", "color2", 0);
    //  newTab(linkedin);
      break;
  case "instagram":
     addLine("Nothing here yet...", "color2", 0);
    // newTab(instagram);
      break;
  case "github":
      addLine("Nothing here yet...", "color2", 0);
    //  newTab(github);
      break;
  case "resume":
        addLine("Nothing here yet...", "color2", 0);
    //    newTab(resume);
        break;
    default:
      addLine("<span class=\"inherit\">Command not found. For a list of commands, type <span class=\"command\">'help'</span>.</span>", "error", 100);
      break;
  }
}

function newTab(link) {
  setTimeout(function() {
    window.open(link, "_blank");
  }, 500);
}

function addLine(text, style, time) {
  var t = "";
  for (let i = 0; i < text.length; i++) {
    if (text.charAt(i) == " " && text.charAt(i + 1) == " ") {
      t += "&nbsp;&nbsp;";
      i++;
    } else {
      t += text.charAt(i);
    }
  }
  setTimeout(function() {
    var next = document.createElement("p");
    next.innerHTML = t;
    next.className = style;

    before.parentNode.insertBefore(next, before);

    window.scrollTo(0, document.body.offsetHeight);
  }, time);
}

function loopLines(name, style, time) {
  name.forEach(function(item, index) {
    addLine(item, style, index * time);
  });
}