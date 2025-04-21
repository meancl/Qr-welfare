let selectedStatus = "";
let selectedRegion = "";
let selectedClasses = [];
let isTouchDevice = false;

document.addEventListener("DOMContentLoaded", function () {
  isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;

  document.getElementById("phone").addEventListener("input", formatPhoneNumber);
  document.getElementById("emergency").addEventListener("input", formatPhoneNumber);
  document.getElementById("resetButton")?.addEventListener("click", resetForm);

  document.querySelector('#step1 .next-button-container button')?.addEventListener('click', () => nextStep(2));

  document.querySelectorAll('.next-button-container button:not(:first-child)').forEach(button => {
    const nextStepNumber = parseInt(button.getAttribute('onclick')?.match(/\d+/)?.[0]);
    if (nextStepNumber) {
      button.addEventListener(isTouchDevice ? 'touchstart' : 'click', () => nextStep(nextStepNumber), { passive: false });
      button.removeAttribute('onclick');
    }
  });

  addToggleListeners('.region-button', handleRegionSelect);
  addToggleListeners('.option-button', handleStatusSelect);
  addToggleListeners('.class-button', handleClassToggle, true);
});

function addToggleListeners(selector, handler, preventDefault = false) {
  document.querySelectorAll(selector).forEach(button => {
    button.addEventListener(isTouchDevice ? 'touchstart' : 'click', function (e) {
      if (preventDefault) e.preventDefault();
      handler(this);
    }, { passive: false });
  });
}

function nextStep(stepNumber) {
  document.querySelectorAll('.step').forEach(step => step.classList.add('hidden'));
  document.getElementById('step' + stepNumber).classList.remove('hidden');

  if (stepNumber === 10) {
    showConfirmation();
  }
}

function submitForm() {
  const formData = new FormData();
  formData.append('name', document.getElementById('name').value);
  formData.append('birth', document.getElementById('birth').value);
  formData.append('phone', document.getElementById('phone').value);
  formData.append('emergency', document.getElementById('emergency').value);
  formData.append('region', selectedRegion);
  formData.append('status', selectedStatus);
  selectedClasses.forEach(className => formData.append('classes', className));

  fetch(location.href, {
    method: 'POST',
    body: formData
  })
  .then(res => res.json())
  .then(response => {
    alert(response.status === "success" ? "✅ 전송 성공! " + response.message : "⚠️ 서버 오류: " + response.message);
    nextStep(11);
  })
  .catch(error => {
    alert("❌ 전송 실패: " + error.message);
    console.error('전송 오류:', error);
  });
}

function resetForm() {
  ['name', 'birth', 'phone', 'emergency'].forEach(id => document.getElementById(id).value = '');
  document.querySelectorAll('.selected').forEach(btn => btn.classList.remove('selected'));
  selectedStatus = "";
  selectedRegion = "";
  selectedClasses = [];
  nextStep(1);
}

function handleClassToggle(element) {
  const isSelected = element.classList.contains("selected");
  const isSongClass = element.classList.contains("song-class");
  const className = element.dataset.name;
  const { day, time } = element.dataset;
  const text = element.textContent.trim();
  const [start, end] = time.split("~").map(t => t.trim());
  const startMin = timeToMinutes(start), endMin = timeToMinutes(end);

  function getClassGroup(name) {
    if (name.includes("한글 기초반")) return "한글 기초반";
    if (name.includes("한글 활용반")) return "한글 활용반";
    if (name.includes("스마트폰")) return "스마트폰";
    if (name.includes("컴퓨터")) return "컴퓨터";
    return name;
  }

  const classGroup = getClassGroup(text);

  if (!isSelected && (classGroup === '스마트폰' || classGroup === '컴퓨터')) {
    const already = [...document.querySelectorAll('.class-button.selected')]
      .some(btn => getClassGroup(btn.dataset.name) === classGroup);
    if (already) {
      alert(classGroup + '반은 1개만 선택 가능합니다.');
      return;
    }
  }

  if (!isSelected) {
    const hasConflict = [...document.querySelectorAll('.class-button.selected')].some(btn => {
      if (btn.dataset.day !== day) return false;
      const [btnStart, btnEnd] = btn.dataset.time.split("~").map(t => t.trim());
      const s = timeToMinutes(btnStart), e = timeToMinutes(btnEnd);
      return startMin < e && endMin > s;
    });

    if (hasConflict) {
      alert(day + "요일 " + time + " 시간대는 이미 선택한 수업과 겹칩니다.");
      return;
    }

    if (!isSongClass) {
      const selectedNonSong = [...document.querySelectorAll('.class-button.selected:not(.song-class)')];
      const uniqueGroups = new Set(selectedNonSong.map(btn => getClassGroup(btn.dataset.name)));
      if (uniqueGroups.size >= 4) {
        alert("노래, 민요 교실 제외 최대 4개 과목까지 신청 가능합니다.");
        return;
      }
    }
  }

  element.classList.toggle('selected');
  updateSelectedClasses();
}

function formatPhoneNumber(e) {
  const input = e.target;
  input.value = input.value.replace(/[^\d]/g, '').replace(/^(\d{3})(\d{0,4})(\d{0,4})$/, (_, a, b, c) => {
    return [a, b, c].filter(Boolean).join('-');
  });
}

function handleStatusSelect(el) {
  document.querySelectorAll(".option-button").forEach(btn => btn.classList.remove("selected"));
  el.classList.add("selected");
  selectedStatus = el.dataset.value;
}

function handleRegionSelect(el) {
  document.querySelectorAll(".region-button").forEach(btn => btn.classList.remove("selected"));
  el.classList.add("selected");
  selectedRegion = el.dataset.value;
}

function updateSelectedClasses() {
  selectedClasses = Array.from(document.querySelectorAll('.class-button.selected')).map(btn => btn.dataset.name);
}

function showConfirmation() {
  document.getElementById("confirm-name").textContent = document.getElementById("name").value;
  document.getElementById("confirm-birth").textContent = document.getElementById("birth").value;
  document.getElementById("confirm-phone").textContent = document.getElementById("phone").value;
  document.getElementById("confirm-emergency").textContent = document.getElementById("emergency").value;
  document.getElementById("confirm-region").textContent = selectedRegion || "선택 안됨";
  document.getElementById("confirm-status").textContent = selectedStatus || "선택 안됨";

  const selectedElements = [...document.querySelectorAll(".class-button.selected")];
  selectedElements.sort((a, b) => {
    const order = ['월', '화', '수', '목', '금'];
    const dayDiff = order.indexOf(a.dataset.day) - order.indexOf(b.dataset.day);
    return dayDiff || timeToMinutes(a.dataset.time) - timeToMinutes(b.dataset.time);
  });

  const list = document.getElementById("confirm-classes");
  list.innerHTML = "";
  selectedElements.forEach(el => {
    const li = document.createElement("li");
    li.innerHTML = `<div class="class-title">${el.dataset.name}</div>` +
                   `<div class="class-time">(${el.dataset.day} ${el.dataset.time})</div>`;
    list.appendChild(li);
  });
}

function timeToMinutes(str) {
  const [h, m] = str.split(":").map(Number);
  return h * 60 + m;
}
