const STORAGE_KEY = 'subtracker-subscriptions';
let subscriptions = loadSubscriptions();

// HTML에서 자주 사용할 요소를 처음 한 번 찾아 객체에 저장한다.
// 이후 함수에서는 긴 querySelector를 반복하지 않고 elements.form처럼 사용한다.
const elements = {
  form: document.querySelector('#subscription-form'),
  modal: document.querySelector('#modal-backdrop'),
  formTitle: document.querySelector('#form-title'),
  id: document.querySelector('#subscription-id'),
  name: document.querySelector('#name'),
  amount: document.querySelector('#amount'),
  cycle: document.querySelector('#cycle'),
  nextPaymentDate: document.querySelector('#next-payment-date'),
  category: document.querySelector('#category'),
  paymentMethod: document.querySelector('#payment-method')
};

// localStorage에서 저장된 구독 목록을 읽어온다.
// 저장된 값이 없거나 JSON 형식이 잘못되었으면 빈 배열로 시작한다.
function loadSubscriptions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    return [];
  }
}

// 현재 subscriptions 배열을 JSON 문자열로 바꾸어 localStorage에 저장한다.
// 브라우저를 닫았다가 다시 열어도 데이터가 남도록 하는 함수다.
function saveSubscriptions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
}

// 데이터가 변경된 뒤 화면의 세 영역을 모두 최신 상태로 다시 그린다.
// 요약, 구독 카드, 카테고리 그래프를 한 곳에서 갱신해 화면 불일치를 막는다.
function refresh() {
  renderSummary(subscriptions);
  renderSubscriptions(subscriptions, openEditForm, deleteSubscription);
  renderCategoryChart(subscriptions);
}

// 새 구독 입력 모달을 열고 첫 번째 입력칸에 커서를 놓는다.
function openForm() {
  elements.modal.hidden = false;
  elements.name.focus();
}

// 입력 모달을 닫고 다음 입력을 위해 폼과 수정 상태를 초기화한다.
function closeForm() {
  elements.modal.hidden = true;
  elements.form.reset();
  elements.id.value = '';
  elements.formTitle.textContent = '새 구독 추가';
}

// id에 해당하는 구독의 기존 데이터를 폼에 채워 수정 모드로 연다.
// 일치하는 구독이 없으면 아무 작업도 하지 않고 종료한다.
function openEditForm(id) {
  const subscription = subscriptions.find(item => item.id === id);
  if (!subscription) return;
  elements.id.value = subscription.id;
  elements.name.value = subscription.name;
  elements.amount.value = subscription.amount;
  elements.cycle.value = subscription.cycle;
  elements.nextPaymentDate.value = subscription.nextPaymentDate;
  elements.category.value = subscription.category;
  elements.paymentMethod.value = subscription.paymentMethod;
  elements.formTitle.textContent = '구독 수정';
  openForm();
}

// id에 해당하는 구독을 확인 대화상자 뒤 삭제한다.
// 배열과 localStorage를 함께 갱신한 뒤 화면도 다시 그린다.
function deleteSubscription(id) {
  const subscription = subscriptions.find(item => item.id === id);
  if (!subscription || !window.confirm(`'${subscription.name}' 구독을 삭제할까요?`)) return;
  subscriptions = subscriptions.filter(item => item.id !== id);
  saveSubscriptions();
  refresh();
}

// 시간과 임의 문자열을 조합해 새 구독에 사용할 고유 id를 만든다.
function createId() {
  return `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// 폼 제출 이벤트를 가로채 새 구독을 추가하거나 기존 구독을 수정한다.
// 저장 후 요약과 목록을 갱신하고 모달을 닫는다.
elements.form.addEventListener('submit', event => {
  event.preventDefault();
  const subscription = {
    id: elements.id.value || createId(),
    name: elements.name.value.trim(),
    amount: Number(elements.amount.value),
    cycle: elements.cycle.value,
    nextPaymentDate: elements.nextPaymentDate.value,
    category: elements.category.value.trim(),
    paymentMethod: elements.paymentMethod.value.trim()
  };
  const existingIndex = subscriptions.findIndex(item => item.id === subscription.id);
  if (existingIndex === -1) subscriptions.push(subscription);
  else subscriptions[existingIndex] = subscription;
  saveSubscriptions();
  refresh();
  closeForm();
});

document.querySelector('#new-subscription-button').addEventListener('click', openForm);
document.querySelector('#empty-add-button').addEventListener('click', openForm);
document.querySelector('#close-modal-button').addEventListener('click', closeForm);
document.querySelector('#cancel-modal-button').addEventListener('click', closeForm);
elements.modal.addEventListener('click', event => {
  if (event.target === elements.modal) closeForm();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !elements.modal.hidden) closeForm();
});

elements.nextPaymentDate.min = getTodayString();
refresh();
