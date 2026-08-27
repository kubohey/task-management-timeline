declare module "holiday-jp" {
  interface Holiday {
    date: Date;
    week: string;
    name: string;
  }

  interface HolidayJp {
    /** 指定期間内の祝日一覧を返す。 */
    between(start: Date, end: Date): Holiday[];
    /** 指定日が祝日かどうかを判定する。 */
    isHoliday(date: Date): boolean;
  }

  const holidayJp: HolidayJp;
  export default holidayJp;
}
