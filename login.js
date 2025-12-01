const socket = io();

loginToggle = () => {
  document.addEventListener("DOMContentLoaded", () => {
    const formTitle = document.getElementById("formTitle");
    const nameField = document.getElementById("nameField");
    const submitBtn = document.getElementById("submitBtn");
    const toggleBtn = document.getElementById("toggleBtn");
    const toggleText = document.getElementById("toggleText");

    let isLogin = true;

    toggleBtn.addEventListener("click", () => {
      isLogin = !isLogin;
      if (isLogin) {
        formTitle.textContent = "Login";
        nameField.classList.add("hidden");
        submitBtn.textContent = "Login";
        toggleText.textContent = "Don’t have an account?";
        toggleBtn.textContent = "Sign Up";
      } else {
        formTitle.textContent = "Sign Up";
        nameField.classList.remove("hidden");
        submitBtn.textContent = "Sign Up";
        toggleText.textContent = "Already have an account?";
        toggleBtn.textContent = "Login";
      }
    });
  });
};

loginToggle();
