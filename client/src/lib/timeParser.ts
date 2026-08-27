// 시간 입력 파싱 헬퍼 (1h, 1.5h, 30m, 2h 30m, 90 등)
export function parseTimeToMinutes(input: string | number): number {
  if (typeof input === "number") return isNaN(input) ? 0 : Math.max(0, input);
  const text = input.trim().toLowerCase();
  if (!text) return 0;

  // 숫자만 들어온 경우: 만약 소수점(예: 1.5, 0.5)이면 시간(hours)으로 취급, 정수(예: 60, 30)면 분(minutes)
  if (/^\d+(\.\d+)?$/.test(text)) {
    const num = parseFloat(text);
    if (text.includes(".")) {
      return Math.round(num * 60);
    }
    return Math.round(num);
  }

  let totalMinutes = 0;

  // 1.5h 또는 2h 매칭
  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:h|시간|hr|hrs)/);
  if (hourMatch) {
    totalMinutes += parseFloat(hourMatch[1]) * 60;
  }

  // 30m 또는 45분 매칭
  const minMatch = text.match(/(\d+)\s*(?:m|분|min|mins)/);
  if (minMatch) {
    totalMinutes += parseInt(minMatch[1], 10);
  }

  return Math.round(totalMinutes);
}

// 분(number)을 1h, 1.5h, 30m 형식 문자열로 변환
export function formatMinutesToHuman(minutes: number): string {
  if (!minutes || minutes <= 0) return "0m";
  if (minutes < 60) return `${minutes}m`;
  const hours = minutes / 60;
  if (Number.isInteger(hours)) return `${hours}h`;
  // 소수점 1자리 (예: 1.5h, 2.5h)
  const fixed = hours.toFixed(1);
  return `${fixed.endsWith(".0") ? Math.floor(hours) : fixed}h`;
}
