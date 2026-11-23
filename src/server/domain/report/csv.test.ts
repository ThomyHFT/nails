import { describe, expect, it } from "vitest";
import { toCsv } from "@/server/domain/report/csv";

describe("toCsv (SPEC 20)", () => {
  it("starts with a BOM and separates with semicolons and CRLF", () => {
    expect(toCsv(["Nombre", "Precio"], [["Señora Muñoz", 15000]])).toBe("﻿Nombre;Precio\r\nSeñora Muñoz;15000\r\n");
  });

  it("quotes cells with separators, quotes or line breaks", () => {
    expect(toCsv(["Nota"], [['Dice "hola"; chao'], ["línea 1\nlínea 2"]])).toBe(
      '﻿Nota\r\n"Dice ""hola""; chao"\r\n"línea 1\nlínea 2"\r\n',
    );
  });

  it("neutralizes text that Excel would run as a formula", () => {
    const csv = toCsv(["Nombre"], [["=HYPERLINK(\"http://x\")"], ["+56 9 1234"], ["-1"], ["@SUM(A1)"]]);
    expect(csv.split("\r\n").slice(1, 5)).toEqual(['"\'=HYPERLINK(""http://x"")"', "'+56 9 1234", "'-1", "'@SUM(A1)"]);
  });

  it("leaves real numbers and empty cells alone", () => {
    expect(toCsv(["a", "b", "c"], [[-5, null, undefined]])).toBe("﻿a;b;c\r\n-5;;\r\n");
  });
});
