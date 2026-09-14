const numberFormatter = new Intl.NumberFormat('ko-KR');

// 숫자를 한국 원화 표기 문자열로 바꾼다.
// 예를 들어 13500을 "13,500원"으로 바꾸어 화면에 표시할 때 사용한다.
function formatWon(amount) {
  return `${numberFormatter.format(amount)}원`;
}

// 사용자가 입력한 문자열을 HTML 안에 안전하게 넣을 수 있도록 특수문자를 치환한다.
// 구독 이름이나 카테고리에 <, > 같은 문자가 들어가도 HTML 태그로 해석되지 않게 한다.
function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character]));
}

// 날짜 입력값(YYYY-MM-DD)을 "9월 24일"처럼 읽기 쉬운 한국어 날짜로 바꾼다.
// 시간을 00:00:00으로 고정해 지역 시간대 때문에 날짜가 하루 밀리는 현상을 줄인다.
function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(date);
}

// 상단 요약 영역을 현재 구독 목록 기준으로 다시 계산하고 화면에 그린다.
// 월 합계와 연간 합계는 logic.js의 계산 함수를 사용하며,
// 결제 예정 수는 오늘부터 7일 이내인 구독만 filterSubscriptionsByNextPayment으로 골라 계산한다.
function renderSummary(subscriptions) {
  document.querySelector('#monthly-total').textContent = formatWon(calculateTotalMonthlyAmount(subscriptions));
  document.querySelector('#yearly-total').textContent = formatWon(calculateTotalYearlyAmount(subscriptions));
  const upcoming = filterSubscriptionsByNextPayment(subscriptions, getTodayString(), 7);
  document.querySelector('#upcoming-total').textContent = `${upcoming.length}건`;
  document.querySelector('#upcoming-note').textContent = upcoming.length ? `${formatWon(calculateTotalMonthlyAmount(upcoming))} 규모` : '앞으로 7일 안에 결제 없음';
}

// 구독 목록을 카드 HTML로 만들어 화면에 표시한다.
// 각 카드에는 월 환산 금액, 카테고리, 결제 수단, 결제일, D-day가 들어간다.
// 카드가 다시 만들어진 뒤에는 수정/삭제 버튼에 전달받은 콜백 함수를 연결한다.
function renderSubscriptions(subscriptions, onEdit, onDelete) {
  const list = document.querySelector('#subscription-list');
  const emptyState = document.querySelector('#empty-state');
  document.querySelector('#subscription-count').textContent = `${subscriptions.length}개`;
  emptyState.hidden = subscriptions.length > 0;
  list.innerHTML = subscriptions.map(subscription => {
    const days = calculateDaysUntilNextPayment(getTodayString(), subscription.nextPaymentDate);
    const ddayText = days < 0 ? '지난 결제' : days === 0 ? '오늘 결제' : `D-${days}`;
    const monthlyAmount = convertToMonthlyAmount(subscription);
    return `<article class="subscription-card">
      <div class="subscription-main"><p class="subscription-name">${escapeHtml(subscription.name)}</p><div class="subscription-meta"><span class="meta-tag">${escapeHtml(subscription.category)}</span><span>${escapeHtml(subscription.paymentMethod)} · ${formatDate(subscription.nextPaymentDate)}</span></div></div>
      <strong class="subscription-price">${formatWon(monthlyAmount)}<small>/월</small></strong>
      <span class="dday${days < 0 ? ' is-past' : ''}">${ddayText}</span>
      <div class="card-actions"><button class="text-button" type="button" data-edit="${escapeHtml(subscription.id)}">수정</button><button class="text-button" type="button" data-delete="${escapeHtml(subscription.id)}">삭제</button></div>
    </article>`;
  }).join('');
  list.querySelectorAll('[data-edit]').forEach(button => button.addEventListener('click', () => onEdit(button.dataset.edit)));
  list.querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', () => onDelete(button.dataset.delete)));
}

// 카테고리별 월 지출을 합산해 막대 그래프로 표시한다.
// 각 카테고리의 금액을 전체 월 지출로 나누어 백분율을 계산한다.
function renderCategoryChart(subscriptions) {
  const chart = document.querySelector('#category-chart');
  const empty = document.querySelector('#chart-empty');
  const totals = groupSubscriptionsByCategory(subscriptions);
  const total = Object.values(totals).reduce((sum, amount) => sum + amount, 0);
  const colors = ['#f17c67', '#55a995', '#e0b74d', '#7189c5', '#b278a7'];
  const categories = Object.entries(totals).sort(([, a], [, b]) => b - a);
  chart.innerHTML = categories.map(([category, amount], index) => {
    const percentage = total ? Math.round((amount / total) * 100) : 0;
    return `<div class="category-row"><div class="category-label"><span>${escapeHtml(category)}</span><span>${percentage}% · ${formatWon(amount)}</span></div><div class="bar-track"><div class="bar-fill" style="width:${percentage}%; background:${colors[index % colors.length]}"></div></div></div>`;
  }).join('');
  empty.hidden = categories.length > 0;
}

// 현재 컴퓨터의 날짜를 YYYY-MM-DD 형식 문자열로 반환한다.
// logic.js의 날짜 계산 함수에 같은 형식의 날짜를 전달하기 위해 사용한다.
function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
