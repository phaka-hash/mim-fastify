type CustomerMock = {
  first_name_th: string;
  middle_name_th: string;
  last_name_th: string;
  telephone: string;
  is_consent: number;
  email: string;
  birthday: string;
  id_card: string;
  passport_no: string;
  telephone_country_id: number;
};

function randomString(length: number) {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  return Array.from(
    { length },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

function randomPhone() {
  return "0" + Math.floor(800000000 + Math.random() * 100000000).toString();
}

function randomDate(start: Date, end: Date) {
  const d = new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
  return d.toISOString().split("T")[0] + "T00:00:00";
}

export function makeRandomCustomer(): CustomerMock {
  const name = "test_merge_" + randomString(5);
  const email = `${name}${Math.floor(Math.random() * 10000)}@dosetech.com`;

  return {
    first_name_th: name,
    middle_name_th: "",
    last_name_th: "last_test_merge",
    telephone: randomPhone(),
    is_consent: Math.random() > 0.5 ? 1 : 0,
    email,
    birthday: randomDate(new Date(1970, 0, 1), new Date(2005, 0, 1)), // 1970-2005
    id_card: "",
    passport_no: "",
    telephone_country_id: 1,
  };
}
