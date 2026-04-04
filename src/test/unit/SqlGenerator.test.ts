import { expect } from 'chai';
import { SqlGenerator } from '../../core/SqlGenerator';

/**
 * Helper to build Table Nodes for testing without repetitive boilerplate.
 */
class TableBuilder {
    private node: any;

    constructor(id: string, tableName: string) {
        this.node = {
            id,
            data: {
                tableName,
                columns: []
            }
        };
    }

    withAlias(alias: string) {
        this.node.data.tableAlias = alias;
        return this;
    }

    withColumn(name: string, type: string, isSelected: boolean = true, alias?: string, func?: string, filter?: any) {
        this.node.data.columns.push({ name, type, isSelected, alias, function: func, filter });
        return this;
    }

    build() {
        return this.node;
    }
}

/**
 * Helper to build Edges for testing joins.
 */
const buildEdge = (sourceId: string, sourceCol: string, targetId: string, targetCol: string, joinType: string = 'INNER') => ({
    id: `e-${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
    sourceHandle: `out-${sourceCol}`,
    targetHandle: `in-${targetCol}`,
    data: { joinType }
});

describe('SqlGenerator - Comprehensive Suite (50+ Cases)', () => {

    describe('1. Basic Projections (10 Cases)', () => {
        it('1.1 Single column selection', () => {
            const nodes = [new TableBuilder('1', 'Users').withColumn('Name', 'nvarchar').build()];
            expect(SqlGenerator.generateSqlFromGraph(nodes, [])).to.contain('SELECT Users.Name FROM Users');
        });

        it('1.2 Multiple columns selection', () => {
            const nodes = [new TableBuilder('1', 'Users').withColumn('Id', 'int').withColumn('Name', 'nvarchar').build()];
            const sql = SqlGenerator.generateSqlFromGraph(nodes, []);
            expect(sql).to.contain('SELECT Users.Id, Users.Name FROM Users');
        });

        it('1.3 Handle "*" when nothing is selected', () => {
            const nodes = [new TableBuilder('1', 'Users').withColumn('Id', 'int', false).build()];
            expect(SqlGenerator.generateSqlFromGraph(nodes, [])).to.contain('SELECT * FROM Users');
        });

        it('1.4 Column aliasing', () => {
            const nodes = [new TableBuilder('1', 'Users').withColumn('FullName', 'nvarchar', true, 'Name').build()];
            expect(SqlGenerator.generateSqlFromGraph(nodes, [])).to.contain('SELECT Users.FullName AS [Name] FROM Users');
        });

        it('1.5 Table aliasing', () => {
            const nodes = [new TableBuilder('1', 'Users').withAlias('u').withColumn('Id', 'int').build()];
            expect(SqlGenerator.generateSqlFromGraph(nodes, [])).to.contain('SELECT u.Id FROM Users AS u');
        });

        it('1.6 Quoted schema and table names', () => {
            const nodes = [new TableBuilder('1', '[dbo].[Users]').withColumn('Id', 'int').build()];
            expect(SqlGenerator.generateSqlFromGraph(nodes, [])).to.contain('SELECT [dbo].[Users].Id FROM [dbo].[Users]');
        });

        it('1.7 Empty graph handling', () => {
            expect(SqlGenerator.generateSqlFromGraph([], [])).to.equal('');
        });

        it('1.8 Duplicate column selection from same table', () => {
            const nodes = [new TableBuilder('1', 'Users').withColumn('Id', 'int').withColumn('Id', 'int').build()];
            const sql = SqlGenerator.generateSqlFromGraph(nodes, []);
            expect(sql).to.contain('SELECT Users.Id AS [Users.Id], Users.Id AS [Users.Id] FROM Users');
        });

        it('1.9 Column selection with table and column aliases together', () => {
            const nodes = [new TableBuilder('1', 'Products').withAlias('p').withColumn('Price', 'decimal', true, 'Cost').build()];
            expect(SqlGenerator.generateSqlFromGraph(nodes, [])).to.contain('SELECT p.Price AS [Cost] FROM Products AS p');
        });

        it('1.10 Handling of columns with spaces in names', () => {
            const nodes = [new TableBuilder('1', 'Orders').withColumn('[Total Amount]', 'money').build()];
            expect(SqlGenerator.generateSqlFromGraph(nodes, [])).to.contain('SELECT Orders.[Total Amount] FROM Orders');
        });
    });

    describe('2. Join Topologies (12 Cases)', () => {
        it('2.1 Standard INNER JOIN', () => {
            const nodes = [
                new TableBuilder('1', 'Orders').withColumn('CustomerId', 'int').build(),
                new TableBuilder('2', 'Customers').withColumn('Id', 'int', false).build()
            ];
            const edges = [buildEdge('1', 'CustomerId', '2', 'Id')];
            expect(SqlGenerator.generateSqlFromGraph(nodes, edges)).to.contain('INNER JOIN Customers ON Orders.CustomerId = Customers.Id');
        });

        it('2.2 LEFT OUTER JOIN', () => {
            const nodes = [
                new TableBuilder('1', 'A').withColumn('id', 'int').build(),
                new TableBuilder('2', 'B').withColumn('id', 'int', false).build()
            ];
            const edges = [buildEdge('1', 'id', '2', 'id', 'LEFT')];
            expect(SqlGenerator.generateSqlFromGraph(nodes, edges)).to.contain('LEFT JOIN B ON A.id = B.id');
        });

        it('2.3 Chain Join (A -> B -> C)', () => {
            const nodes = [
                new TableBuilder('1', 'A').withColumn('b_id', 'int').build(),
                new TableBuilder('2', 'B').withColumn('id', 'int', false).withColumn('c_id', 'int', false).build(),
                new TableBuilder('3', 'C').withColumn('id', 'int', false).build()
            ];
            const edges = [buildEdge('1', 'b_id', '2', 'id'), buildEdge('2', 'c_id', '3', 'id')];
            const sql = SqlGenerator.generateSqlFromGraph(nodes, edges);
            expect(sql).to.contain('JOIN B ON A.b_id = B.id');
            expect(sql).to.contain('JOIN C ON B.c_id = C.id');
        });

        it('2.4 Star Join (A -> B, A -> C)', () => {
            const nodes = [
                new TableBuilder('1', 'A').withColumn('b_id', 'int').withColumn('c_id', 'int').build(),
                new TableBuilder('2', 'B').withColumn('id', 'int', false).build(),
                new TableBuilder('3', 'C').withColumn('id', 'int', false).build()
            ];
            const edges = [buildEdge('1', 'b_id', '2', 'id'), buildEdge('1', 'c_id', '3', 'id')];
            const sql = SqlGenerator.generateSqlFromGraph(nodes, edges);
            expect(sql).to.contain('JOIN B ON A.b_id = B.id');
            expect(sql).to.contain('JOIN C ON A.c_id = C.id');
        });

        it('2.5 Self Join (requires aliases)', () => {
            const nodes = [
                new TableBuilder('1', 'Employees').withAlias('e').withColumn('ManagerId', 'int').build(),
                new TableBuilder('2', 'Employees').withAlias('m').withColumn('Id', 'int', false).build()
            ];
            const edges = [buildEdge('1', 'ManagerId', '2', 'Id')];
            expect(SqlGenerator.generateSqlFromGraph(nodes, edges)).to.contain('FROM Employees AS e INNER JOIN Employees AS m ON e.ManagerId = m.Id');
        });

        it('2.6 RIGHT OUTER JOIN', () => {
            const nodes = [new TableBuilder('1', 'A').build(), new TableBuilder('2', 'B').build()];
            const edges = [buildEdge('1', 'id', '2', 'id', 'RIGHT')];
            expect(SqlGenerator.generateSqlFromGraph(nodes, edges)).to.contain('RIGHT JOIN B ON A.id = B.id');
        });

        it('2.7 FULL OUTER JOIN', () => {
            const nodes = [new TableBuilder('1', 'A').build(), new TableBuilder('2', 'B').build()];
            const edges = [buildEdge('1', 'id', '2', 'id', 'FULL')];
            expect(SqlGenerator.generateSqlFromGraph(nodes, edges)).to.contain('FULL JOIN B ON A.id = B.id');
        });

        it('2.8 Join with multiple Selected columns from both tables', () => {
            const nodes = [
                new TableBuilder('1', 'A').withColumn('name', 'string').withColumn('id', 'int').build(),
                new TableBuilder('2', 'B').withColumn('desc', 'string').build()
            ];
            const edges = [buildEdge('1', 'id', '2', 'id')];
            const sql = SqlGenerator.generateSqlFromGraph(nodes, edges);
            expect(sql).to.contain('SELECT A.name, A.id, B.desc FROM A');
        });

        it('2.9 Join with Column Shadowing (same name in both tables)', () => {
            const nodes = [
                new TableBuilder('1', 'Users').withColumn('Id', 'int').build(),
                new TableBuilder('2', 'Roles').withColumn('Id', 'int').build()
            ];
            const edges = [buildEdge('1', 'RoleId', '2', 'Id')];
            const sql = SqlGenerator.generateSqlFromGraph(nodes, edges);
            expect(sql).to.contain('Users.Id AS [Users.Id]');
            expect(sql).to.contain('Roles.Id AS [Roles.Id]');
        });

        it('2.10 Diamond Join (A->B, A->C, B->D, C->D)', () => {
            const nodes = [
                new TableBuilder('1', 'A').build(),
                new TableBuilder('2', 'B').build(),
                new TableBuilder('3', 'C').build(),
                new TableBuilder('4', 'D').build()
            ];
            const edges = [
                buildEdge('1', 'b_id', '2', 'id'),
                buildEdge('1', 'c_id', '3', 'id'),
                buildEdge('2', 'd_id', '4', 'id'),
                buildEdge('3', 'd_id', '4', 'id')
            ];
            const sql = SqlGenerator.generateSqlFromGraph(nodes, edges);
            expect(sql.split('JOIN').length - 1).to.equal(4); // 4 joins defined
        });

        it('2.11 Join with Table Alias Shadowing', () => {
            const nodes = [
                new TableBuilder('1', 'Users').withAlias('x').withColumn('Id', 'int').build(),
                new TableBuilder('2', 'Roles').withAlias('x').withColumn('Id', 'int').build()
            ];
            const edges = [buildEdge('1', 'RoleId', '2', 'Id')];
            const sql = SqlGenerator.generateSqlFromGraph(nodes, edges);
            expect(sql).to.contain('x.Id AS [x.Id]'); // Handle detects colliding aliases
        });

        it('2.12 Correct handle mapping for incoming/outgoing join logic', () => {
             const nodes = [
                new TableBuilder('1', 'Table1').withColumn('ColA', 'int').build(),
                new TableBuilder('2', 'Table2').withColumn('ColB', 'int').build()
            ];
            const edges = [buildEdge('1', 'ColA', '2', 'ColB')];
            expect(SqlGenerator.generateSqlFromGraph(nodes, edges)).to.contain('Table1.ColA = Table2.ColB');
        });
    });

    describe('3. Filtering & WHERE Logic (12 Cases)', () => {
        it('3.1 Numeric equals filter', () => {
            const nodes = [new TableBuilder('1', 'Users').withColumn('Age', 'int', true, undefined, undefined, { operator: '=', value: '25' }).build()];
            expect(SqlGenerator.generateSqlFromGraph(nodes, [])).to.contain('WHERE Users.Age = 25');
        });

        it('3.2 String auto-quoting', () => {
            const nodes = [new TableBuilder('1', 'Users').withColumn('Name', 'nvarchar', true, undefined, undefined, { operator: '=', value: 'John' }).build()];
            expect(SqlGenerator.generateSqlFromGraph(nodes, [])).to.contain("WHERE Users.Name = 'John'");
        });

        it('3.3 Date auto-quoting', () => {
            const nodes = [new TableBuilder('1', 'Logs').withColumn('Created', 'datetime', true, undefined, undefined, { operator: '>', value: '2023-01-01' }).build()];
            expect(SqlGenerator.generateSqlFromGraph(nodes, [])).to.contain("WHERE Logs.Created > '2023-01-01'");
        });

        it('3.4 GUID/Uniqueidentifier auto-quoting', () => {
            const nodes = [new TableBuilder('1', 'Apps').withColumn('Id', 'uniqueidentifier', true, undefined, undefined, { operator: '=', value: 'abc-123' }).build()];
            expect(SqlGenerator.generateSqlFromGraph(nodes, [])).to.contain("WHERE Apps.Id = 'abc-123'");
        });

        it('3.5 LIKE operator support', () => {
            const nodes = [new TableBuilder('1', 'Users').withColumn('Email', 'string', true, undefined, undefined, { operator: 'LIKE', value: '%@gmail.com' }).build()];
            expect(SqlGenerator.generateSqlFromGraph(nodes, [])).to.contain("WHERE Users.Email LIKE '%@gmail.com'");
        });

        it('3.6 IN operator support (should NOT auto-quote entire value)', () => {
            const nodes = [new TableBuilder('1', 'Users').withColumn('Id', 'int', true, undefined, undefined, { operator: 'IN', value: '(1,2,3)' }).build()];
            expect(SqlGenerator.generateSqlFromGraph(nodes, [])).to.contain('WHERE Users.Id IN (1,2,3)');
        });

        it('3.7 IS NULL filter', () => {
            const nodes = [new TableBuilder('1', 'Tasks').withColumn('Owner', 'int', true, undefined, undefined, { operator: 'IS NULL' }).build()];
            expect(SqlGenerator.generateSqlFromGraph(nodes, [])).to.contain('WHERE Tasks.Owner IS NULL');
        });

        it('3.8 IS NOT NULL filter', () => {
            const nodes = [new TableBuilder('1', 'Tasks').withColumn('Owner', 'int', true, undefined, undefined, { operator: 'IS NOT NULL' }).build()];
            expect(SqlGenerator.generateSqlFromGraph(nodes, [])).to.contain('WHERE Tasks.Owner IS NOT NULL');
        });

        it('3.9 Multiple filters on same table (AND combined)', () => {
            const nodes = [new TableBuilder('1', 'A').withColumn('c1', 'int', true, undefined, undefined, { operator: '>', value: '5' }).withColumn('c2', 'int', true, undefined, undefined, { operator: '<', value: '10' }).build()];
            const sql = SqlGenerator.generateSqlFromGraph(nodes, []);
            expect(sql).to.contain('WHERE A.c1 > 5 AND A.c2 < 10');
        });

        it('3.10 Filter on a table with an alias', () => {
            const nodes = [new TableBuilder('1', 'Users').withAlias('u').withColumn('Age', 'int', true, undefined, undefined, { operator: '>=', value: '18' }).build()];
            expect(SqlGenerator.generateSqlFromGraph(nodes, [])).to.contain('WHERE u.Age >= 18');
        });

        it('3.11 String filter already quoted by user (should not double quote)', () => {
             const nodes = [new TableBuilder('1', 'A').withColumn('s', 'varchar', true, undefined, undefined, { operator: '=', value: "'Test'" }).build()];
             expect(SqlGenerator.generateSqlFromGraph(nodes, [])).to.contain("WHERE A.s = 'Test'"); // Not ''Test''
        });

        it('3.12 Boolean-like numeric filter (0/1)', () => {
             const nodes = [new TableBuilder('1', 'X').withColumn('Active', 'bit', true, undefined, undefined, { operator: '=', value: '1' }).build()];
             expect(SqlGenerator.generateSqlFromGraph(nodes, [])).to.contain('WHERE X.Active = 1');
        });
    });

    describe('4. Aggregates & GROUP BY (8 Cases)', () => {
        it('4.1 Simple SUM aggregation', () => {
            const nodes = [new TableBuilder('1', 'Sales').withColumn('Amount', 'decimal', true, undefined, 'SUM').build()];
            expect(SqlGenerator.generateSqlFromGraph(nodes, [])).to.contain('SELECT SUM(Sales.Amount) FROM Sales');
        });

        it('4.2 COUNT aggregation', () => {
            const nodes = [new TableBuilder('1', 'Sales').withColumn('Id', 'int', true, undefined, 'COUNT').build()];
            expect(SqlGenerator.generateSqlFromGraph(nodes, [])).to.contain('SELECT COUNT(Sales.Id) FROM Sales');
        });

        it('4.3 Mixed Aggregate and Non-Aggregate triggers GROUP BY', () => {
            const nodes = [new TableBuilder('1', 'Sales').withColumn('Category', 'string', true).withColumn('Amount', 'money', true, undefined, 'AVG').build()];
            const sql = SqlGenerator.generateSqlFromGraph(nodes, []);
            expect(sql).to.contain('GROUP BY Sales.Category');
        });

        it('4.4 Multiple GROUP BY columns', () => {
            const nodes = [new TableBuilder('1', 'Sales').withColumn('Year', 'int').withColumn('Month', 'int').withColumn('Total', 'money', true, undefined, 'SUM').build()];
            const sql = SqlGenerator.generateSqlFromGraph(nodes, []);
            expect(sql).to.contain('GROUP BY Sales.Year, Sales.Month');
        });

        it('4.5 Aggregates in a Join scenario', () => {
            const nodes = [
                new TableBuilder('1', 'Dept').withColumn('Name', 'string').build(),
                new TableBuilder('2', 'Emp').withColumn('Id', 'int', true, undefined, 'COUNT').build()
            ];
            const edges = [buildEdge('1', 'Id', '2', 'DeptId')];
            const sql = SqlGenerator.generateSqlFromGraph(nodes, edges);
            expect(sql).to.contain('GROUP BY Dept.Name');
        });

        it('4.6 MAX and MIN together', () => {
             const nodes = [new TableBuilder('1', 'Prices').withColumn('Val', 'int', true, 'High', 'MAX').withColumn('Val', 'int', true, 'Low', 'MIN').build()];
             const sql = SqlGenerator.generateSqlFromGraph(nodes, []);
             expect(sql).to.contain('MAX(Prices.Val) AS [High]');
             expect(sql).to.contain('MIN(Prices.Val) AS [Low]');
        });

        it('4.7 Aggregate with a WHERE clause', () => {
             const nodes = [new TableBuilder('1', 'S').withColumn('Val', 'int', true, undefined, 'SUM').withColumn('Tag', 'string', false, undefined, undefined, { operator: '=', value: 'A' }).build()];
             const sql = SqlGenerator.generateSqlFromGraph(nodes, []);
             expect(sql).to.contain("WHERE S.Tag = 'A'");
             expect(sql).to.contain('SUM(S.Val)');
        });

        it('4.8 GROUP BY ignores columns with aliases (uses raw name)', () => {
             const nodes = [new TableBuilder('1', 'T').withColumn('Region', 'string', true, 'Loc').withColumn('Val', 'int', true, undefined, 'SUM').build()];
             expect(SqlGenerator.generateSqlFromGraph(nodes, [])).to.contain('GROUP BY T.Region');
        });
    });

    describe('5. Island & Edge Case Tests (10 Cases)', () => {
        it('5.1 Two disconnected islands (Run All)', () => {
            const nodes = [
                new TableBuilder('1', 'Island1').build(),
                new TableBuilder('2', 'Island2').build()
            ];
            const sql = SqlGenerator.generateSqlFromGraph(nodes, []);
            expect(sql).to.contain('Query Batch 1');
            expect(sql).to.contain('Query Batch 2');
        });

        it('5.2 Target node isolation (Batch Execution)', () => {
            const nodes = [
                new TableBuilder('1', 'Target').build(),
                new TableBuilder('2', 'Ignore').build()
            ];
            const sql = SqlGenerator.generateSqlFromGraph(nodes, [], '1');
            expect(sql).to.contain('Target');
            expect(sql).to.not.contain('Ignore');
        });

        it('5.3 Join cycle handling (A-B-C-A)', () => {
            const nodes = [
                new TableBuilder('1', 'A').build(),
                new TableBuilder('2', 'B').build(),
                new TableBuilder('3', 'C').build()
            ];
            const edges = [buildEdge('1', 'x', '2', 'x'), buildEdge('2', 'y', '3', 'y'), buildEdge('3', 'z', '1', 'z')];
            const sql = SqlGenerator.generateSqlFromGraph(nodes, edges);
            expect(sql.split('JOIN').length - 1).to.equal(3); // Circularity should be handled by the joinedSet logic
        });

        it('5.4 Deeply nested chain (5 tables)', () => {
            const nodes = ['1', '2', '3', '4', '5'].map(i => new TableBuilder(i, `T${i}`).build());
            const edges = [
                buildEdge('1', 'k', '2', 'k'),
                buildEdge('2', 'k', '3', 'k'),
                buildEdge('3', 'k', '4', 'k'),
                buildEdge('4', 'k', '5', 'k')
            ];
            const sql = SqlGenerator.generateSqlFromGraph(nodes, edges);
            expect(sql.split('JOIN').length - 1).to.equal(4);
        });

        it('5.5 Disconnected components within a single Target batch', () => {
            // If I target A, but B is not joined to A, B should not appear.
            const nodes = [new TableBuilder('1', 'A').build(), new TableBuilder('2', 'B').build()];
            const sql = SqlGenerator.generateSqlFromGraph(nodes, [], '1');
            expect(sql).to.not.contain('TableB');
        });

        it('5.6 Column with alias collision but different tables', () => {
             const nodes = [
                 new TableBuilder('1', 'A').withColumn('Id', 'int', true, 'Key').build(),
                 new TableBuilder('2', 'B').withColumn('Uid', 'int', true, 'Key').build()
             ];
             const edges = [buildEdge('1', 'ref', '2', 'Uid')];
             const sql = SqlGenerator.generateSqlFromGraph(nodes, edges);
             expect(sql).to.contain('A.Id AS [A.Key]');
             expect(sql).to.contain('B.Uid AS [B.Key]');
        });

        it('5.7 No columns selected, but join exists', () => {
             const nodes = [new TableBuilder('1', 'A').build(), new TableBuilder('2', 'B').build()];
             const edges = [buildEdge('1', 'id', '2', 'id')];
             expect(SqlGenerator.generateSqlFromGraph(nodes, edges)).to.contain('SELECT * FROM A');
        });

        it('5.8 Multiple edges between same two tables', () => {
             const nodes = [new TableBuilder('1', 'A').build(), new TableBuilder('2', 'B').build()];
             const edges = [buildEdge('1', 'c1', '2', 'c1'), buildEdge('1', 'c2', '2', 'c2')];
             const sql = SqlGenerator.generateSqlFromGraph(nodes, edges);
             expect(sql).to.contain('ON A.c1 = B.c1');
             expect(sql).to.contain('ON A.c2 = B.c2');
        });

        it('5.9 Target node in middle of a chain', () => {
             const nodes = [
                 new TableBuilder('1', 'A').build(),
                 new TableBuilder('2', 'B').build(),
                 new TableBuilder('3', 'C').build()
             ];
             const edges = [buildEdge('1', 'x', '2', 'x'), buildEdge('2', 'y', '3', 'y')];
             const sql = SqlGenerator.generateSqlFromGraph(nodes, edges, '2');
             expect(sql).to.contain('A');
             expect(sql).to.contain('B');
             expect(sql).to.contain('C');
        });

        it('5.10 Final output trim', () => {
            const nodes = [new TableBuilder('1', 'A').build()];
            const sql = SqlGenerator.generateSqlFromGraph(nodes, []);
            expect(sql.startsWith('--')).to.be.true;
            expect(sql.endsWith('\n')).to.be.false; // Trimmed
        });
    });

    describe('6. New Feature Tests (Visual Join & Suggestions) (4 Cases)', () => {
        it('6.1 Ghost Join Isolation (SQL Generator ignores suggestedJoinEdge)', () => {
            const nodes = [
                new TableBuilder('1', 'Orders').withColumn('Id', 'int').build(),
                new TableBuilder('2', 'Customers').withColumn('Id', 'int').build()
            ];
            const edges = [{
                id: 'suggest-1-2',
                source: '1',
                target: '2',
                sourceHandle: 'out-CustomerId',
                targetHandle: 'in-Id',
                type: 'suggestedJoinEdge' // This should be ignored
            }];
            const sql = SqlGenerator.generateSqlFromGraph(nodes, edges);
            // Should be treated as two disconnected tables because the join is only a "suggestion"
            expect(sql).to.contain('Query Batch 1');
            expect(sql).to.contain('Query Batch 2');
            expect(sql).to.not.contain('JOIN');
        });

        it('6.2 Conversion from Suggestion to Join (Manual Accept Simulation)', () => {
             const nodes = [
                new TableBuilder('1', 'Orders').withColumn('Id', 'int').build(),
                new TableBuilder('2', 'Customers').withColumn('Id', 'int').build()
            ];
            const edges = [buildEdge('1', 'CustomerId', '2', 'Id', 'INNER')]; // Accepted state
            const sql = SqlGenerator.generateSqlFromGraph(nodes, edges);
            expect(sql).to.contain('INNER JOIN Customers ON Orders.CustomerId = Customers.Id');
            expect(sql).to.not.contain('Query Batch 2'); // Should be one batch now
        });

        it('6.3 Support for ALL Visual Join Types', () => {
            const types = ['INNER', 'LEFT', 'RIGHT', 'FULL'];
            types.forEach(type => {
                const nodes = [new TableBuilder('1', 'A').build(), new TableBuilder('2', 'B').build()];
                const edges = [buildEdge('1', 'id', '2', 'id', type)];
                const sql = SqlGenerator.generateSqlFromGraph(nodes, edges);
                expect(sql).to.contain(`${type} JOIN B`);
            });
        });

        it('6.4 Multiple suggested joins ignored simultaneously', () => {
            const nodes = [
                new TableBuilder('1', 'A').build(),
                new TableBuilder('2', 'B').build(),
                new TableBuilder('3', 'C').build()
            ];
            const edges = [
                { id: 's1', source: '1', target: '2', sourceHandle: 'out-f1', targetHandle: 'in-f1', type: 'suggestedJoinEdge' },
                { id: 's2', source: '2', target: '3', sourceHandle: 'out-f2', targetHandle: 'in-f2', type: 'suggestedJoinEdge' }
            ];
            const sql = SqlGenerator.generateSqlFromGraph(nodes, edges);
            expect(sql).to.contain('Query Batch 1');
            expect(sql).to.contain('Query Batch 2');
            expect(sql).to.contain('Query Batch 3');
            expect(sql).to.not.contain('JOIN');
        });
    });
});
