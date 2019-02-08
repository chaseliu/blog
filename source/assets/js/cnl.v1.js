function clock(selector, ts, countdown) {
  const clk = document.querySelector(selector)
  const cols = ['days', ':', 'hours', ':', 'minutes', ':', 'seconds'].map(x => {
    const head = document.createElement('div')
    head.setAttribute('class', 'head')
    const digits = document.createElement('div')
    digits.setAttribute('class', 'digits')
    if (x === ':') {
      head.textContent = '\u00a0'
      digits.textContent = x
    } else {
      head.textContent = x
    }
    const col = document.createElement('div')
    col.setAttribute('class', 'col')
    col.appendChild(head)
    col.appendChild(digits)
    return col
  });
  cols.forEach(col => { clk.appendChild(col) })
  const digitsArray = document.querySelectorAll(selector + ' .digits')
  const daysDom = digitsArray[0]
  const hoursDom = digitsArray[2]
  const minutesDom = digitsArray[4]
  const secondsDom = digitsArray[6]
  function refresh() {
    const diff = countdown ? ts - Date.now() : Date.now() - ts
    let days = hours = minutes = seconds = 0
    if (diff > 0) {
      days = parseInt(diff / 1000 / 60 / 60 / 24)
      hours = parseInt(diff / 1000 / 60 / 60 % 24)
      minutes = parseInt(diff / 1000 / 60 % 60)
      seconds = parseInt(diff / 1000 % 60)
    }
    daysDom.textContent = days < 10 ? '0' + days : days
    hoursDom.textContent = hours < 10 ? '0' + hours : hours
    minutesDom.textContent = minutes < 10 ? '0' + minutes : minutes
    secondsDom.textContent = seconds < 10 ? '0' + seconds : seconds
  }
  refresh()
  return setInterval(refresh, 1000)
};
