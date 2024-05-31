import Particles from "./Particles";

let particles = new Particles({
  width: 800,
  height: 800,
  count: 100,
  size: 3,
  color: "#ededed",
  maxLine: 200,
  lineWidth: 1,
});

particles.mount(document.querySelector("#app")!);

// setTimeout(() => {
//   particles.destroy();
//   (particles as any) = null;
// }, 3000);
