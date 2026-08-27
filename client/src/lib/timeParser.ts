// 시간 입력 파싱 헬퍼 (1h, 0.5h, 1.5h, 30m, 2h 30m, 90 등)
export function parseTimeToMinutes(input: string | number): number {
  if (typeof input === "number") return isNaN(input) ? 0 : Math.max(0, input);
  const text = input.trim().toLowerCase();
  if (!text) return 0;

  // 0, 0h, 0m
  if (text === "0" || text === "0h" || text === "0m") return 0;

  // 숫자만 들어온 경우: 소수점(예: 0.5, 1.5)이면 시간(hours), 정수(예: 60, 30)면 분(minutes)
  if (/^\d+(\.\d+)?$/.test(text)) {
    const num = parseFloat(text);
    if (text.includes(".")) {
      return Math.round(num * 60);
    }
    return Math.round(num);
  }

  let totalMinutes = 0;

  // 0.5h, 1h, 1.5h, 2h 매칭
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

// 분(number)을 1h, 0.5h, 1.5h, 30m 형식 문자열로 변환 (0분은 0h)
export function formatMinutesToHuman(minutes: number): string {
  if (!minutes || minutes <= 0) return "0h";
  const hours = minutes / 60;
  if (Number.isInteger(hours)) return `${hours}h`;
  // 30분, 15분 등 소수점 시간
  const fixed = hours.toFixed(1);
  return `${fixed.endsWith(".0") ? Math.floor(hours) : fixed}h`;
}
