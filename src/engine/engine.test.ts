import FormulaParser, { FormulaError } from "fast-formula-parser";
import { CellBase } from "../types";
import { ORIGIN, Point } from "../point";
import * as Formula from "./formula";
import { getFormulaComputedValue, updateCellValue, Model } from "./engine";

const MOCK_PARSE = jest.fn();
const MOCK_FORMULA_PARSER = {
  parse: MOCK_PARSE,
} as unknown as FormulaParser;
const EXAMPLE_FORMULA_RESULT = 42;
const EXAMPLE_FORMULA_ERROR = "EXAMPLE_ERROR";
const EXAMPLE_FORMULA = "=A1";

describe("getFormulaComputedValue()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  const cases: Array<
    [name: string, expected: number | string, mockParseReturn: number | string]
  > = [
    [
      "Returns parsed formula result",
      EXAMPLE_FORMULA_RESULT,
      EXAMPLE_FORMULA_RESULT,
    ],
    [
      "Returns parsed formula error",
      EXAMPLE_FORMULA_ERROR,
      EXAMPLE_FORMULA_ERROR,
    ],
  ];
  test.each(cases)("%s", (name, expected, mockParseReturn) => {
    MOCK_PARSE.mockImplementationOnce(() => mockParseReturn);
    expect(
      getFormulaComputedValue(EXAMPLE_FORMULA, ORIGIN, MOCK_FORMULA_PARSER)
    ).toBe(expected);
    expect(MOCK_FORMULA_PARSER.parse).toHaveBeenCalledTimes(1);
    expect(MOCK_FORMULA_PARSER.parse).toHaveBeenCalledWith(
      Formula.extractFormula(EXAMPLE_FORMULA),
      { col: 1, row: 1, sheet: "Sheet1" }
    );
  });
});

describe("updateCellValue", () => {
  test("update simple cell", () => {
    const model = new Model(Formula.createFormulaParser, []);
    const cell: CellBase = { value: "1" };
    const point: Point = { row: 0, column: 0 };
    const nextModel = updateCellValue(model, point, cell);
    expect(nextModel.data).toEqual([[cell]]);
    expect(nextModel.evaluatedData).toEqual([[cell]]);
  });
  test("update simple formula cell", () => {
    const data = [[{ value: 1 }], [{ value: 2 }]];
    const model = new Model(Formula.createFormulaParser, data);
    const cell: CellBase = { value: "=A1" };
    const point: Point = { row: 0, column: 1 };
    const nextModel = updateCellValue(model, point, cell);
    expect(nextModel.data).toEqual([[{ value: 1 }, cell], [{ value: 2 }]]);
    expect(nextModel.evaluatedData).toEqual([
      [{ value: 1 }, { value: 1 }],
      [{ value: 2 }],
    ]);
  });
  test("update range formula cell", () => {
    const data = [[{ value: 1 }], [{ value: 2 }]];
    const model = new Model(Formula.createFormulaParser, data);
    const cell: CellBase = { value: "=SUM(A:A)" };
    const point: Point = { row: 0, column: 1 };
    const nextModel = updateCellValue(model, point, cell);
    expect(nextModel.data).toEqual([[{ value: 1 }, cell], [{ value: 2 }]]);
    expect(nextModel.evaluatedData).toEqual([
      [{ value: 1 }, { value: 3 }],
      [{ value: 2 }],
    ]);
  });
  test("errors correctly for circular reference", () => {
    const data = [[{ value: 1 }], [{ value: 2 }]];
    const model = new Model(Formula.createFormulaParser, data);
    const cell: CellBase = { value: "=SUM(A:A)" };
    const point: Point = { row: 0, column: 0 };
    const nextModel = updateCellValue(model, point, cell);
    expect(nextModel.data).toEqual([[cell], [{ value: 2 }]]);
    expect(nextModel.evaluatedData).toEqual([
      [{ value: FormulaError.REF }],
      [{ value: 2 }],
    ]);
  });
});
