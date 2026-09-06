const backgroundColorOne = "bg-white";
const flashTime = 2000;
const backgroundTime = 15000;
const animationDuration = backgroundTime / 6;
const changeOnDemandAnimationDuration = 500;
const toggleContentDuration = 1000;
const simpleFlashElements = document.querySelectorAll(".flash");
const sequenceFlashElements = document.querySelectorAll(".flash-seq");
const displayButton = document.querySelector("#display-toggle");
const displayButtonContents = document.querySelector("#display-toggle > svg");
const elementsToHide = document.querySelectorAll(".page-section:not(footer)");
const imgDescription = document.querySelector(".img-description");
const backgroundKey = "currentBackgroundIndex";
const nextBackgroundButton = document.getElementById("background-next");
const prevBackgroundButton = document.getElementById("background-previous");
const fadeKeyFrames = ({ reverse }) =>
  reverse ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 1 }];

const translateY = (value) => `translateY(${value}px)`;
const slideKeyFrames = ({ reverse, element }) => {
  const offScreen = window.innerHeight - element.getBoundingClientRect().top;
  return reverse
    ? [{ transform: translateY(0) }, { transform: translateY(offScreen) }]
    : [
        { transform: translateY(document.documentElement.scrollHeight) },
        { transform: translateY(0) },
      ];
};
const rotate = (degrees) => `rotate(${degrees}deg)`;
const rotateKeyFrames = ({ reverse }) =>
  reverse
    ? [{ transform: rotate(0) }, { transform: rotate(180) }]
    : [{ transform: rotate(180) }, { transform: rotate(0) }];

async function handleAnimation(
  keyframes,
  element,
  keyframeArgs,
  duration,
  pseudoElement = undefined
) {
  if (!element) return Promise.resolve();

  const animation = element.animate(keyframes(keyframeArgs), {
    duration: duration,
    fill: "forwards", // Keeps the final opacity state when done
    easing: "ease-in-out",
    pseudoElement: pseudoElement,
  });

  return animation.finished;
}

function flashElement(element, color) {
  element.classList.toggle(color);
}

async function handleToggle(element, reverse) {
  if (!reverse) element.classList.toggle("d-none");
  await handleAnimation(
    slideKeyFrames,
    element,
    { reverse: reverse, element: element },
    changeOnDemandAnimationDuration
  );
  if (reverse) element.classList.toggle("d-none");
}

let toggleLocked = false; //throttle
async function displayToggle() {
  if (!toggleLocked) {
    toggleLocked = true;
    const hidden = !elementsToHide[0].classList.contains("d-none");
    elementsToHide.forEach((element) => {
      handleToggle(element, hidden);
    });
    await handleAnimation(
      rotateKeyFrames,
      displayButtonContents,
      { reverse: hidden },
      toggleContentDuration / 3
    );
    toggleLocked = false;
  }
}

let index = 0;
let count = 0;

async function flashInterval() {
  flashElement(sequenceFlashElements[index], backgroundColorOne);
  if (count == 1) {
    index++;
    index = index % sequenceFlashElements.length;
  }
  count++;
  count = count % 2;
}

async function loadBackgrounds() {
  const data = await fetch("./images/backgrounds.json");
  return await data.json();
}

function changeBackground(image) {
  document.body.style.setProperty("--bg-image", `url("${image?.path}")`);
  imgDescription.innerHTML = `<strong> Image Description:</strong> ${image.description || "No Image Description"}`;
}

//simple flash
setInterval(() => {
  for (const element of simpleFlashElements) {
    flashElement(element, backgroundColorOne);
  }
}, flashTime);

//sequential flash
if (sequenceFlashElements.length > 0) {
  setInterval(() => {
    flashInterval();
  }, flashTime);
}
const backgrounds = await loadBackgrounds();
const currentBackgroundIndex = localStorage.getItem(backgroundKey);
let bIndex = Number.parseInt(currentBackgroundIndex ?? 0);

let subsequent = false;
let handler = undefined;
async function backgroundHandler(duration = animationDuration) {
  if (backgrounds != undefined && backgrounds.length > 0) {
    bIndex = Math.abs(bIndex % backgrounds.length); //why JavaScript?
    if (subsequent) {
      (void handleAnimation(
        fadeKeyFrames,
        document.body,
        { reverse: true },
        duration,
        "::before"
      ),
        await handleAnimation(
          fadeKeyFrames,
          imgDescription,
          { reverse: true },
          duration
        ));
    }
    localStorage.setItem(backgroundKey, bIndex);
    //attempt to cache image in browser prior to fade in
    await fetch(backgrounds[bIndex].path);
    void handleAnimation(
      fadeKeyFrames,
      document.body,
      { reverse: false },
      duration,
      "::before"
    );
    void handleAnimation(
      fadeKeyFrames,
      imgDescription,
      { reverse: false },
      duration
    );
    changeBackground(backgrounds[bIndex++]);
  }
  subsequent = true;
  handler = setTimeout(backgroundHandler, backgroundTime);
}

displayButton.addEventListener("click", displayToggle);

let backgroundChangeLocked = false; //throttle

nextBackgroundButton.addEventListener("click", async () => {
  if (!backgroundChangeLocked) {
    backgroundChangeLocked = true;
    if (handler) clearTimeout(handler);
    await backgroundHandler(changeOnDemandAnimationDuration);
    backgroundChangeLocked = false;
  }
});

prevBackgroundButton.addEventListener("click", async () => {
  if (!backgroundChangeLocked) {
    backgroundChangeLocked = true;
    if (handler) clearTimeout(handler);
    bIndex -= 2;
    if (bIndex < 0) bIndex = backgrounds.length - 1;
    await backgroundHandler(changeOnDemandAnimationDuration);
    backgroundChangeLocked = false;
  }
});

backgroundHandler();

if (!localStorage.getItem(backgroundKey))
  for (const background of backgrounds) await fetch(background.path);
