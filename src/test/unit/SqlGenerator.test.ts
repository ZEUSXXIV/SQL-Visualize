import { expect } from 'chai';
import { SqlGenerator } from '../../core/SqlGenerator';

describe('SqlGenerator', () => {
    it('should generate a simple SELECT for a single table', () => {
        const nodes = [
            {
                id: '1',
                data: {
                    tableName: 'Users',
                    columns: [
                        { name: 'Id', type: 'int', isSelected: true },
                        { name: 'Name', type: 'nvarchar', isSelected: true }
                    ]
                }
            }
        ];
        const edges: any[] = [];
        
        const sql = SqlGenerator.generateSqlFromGraph(nodes, edges);
        expect(sql).to.contain('SELECT Users.Id, Users.Name FROM Users');
    });

    it('should handle table aliases', () => {
        const nodes = [
            {
                id: '1',
                data: {
                    tableName: 'Users',
                    tableAlias: 'u',
                    columns: [
                        { name: 'Id', type: 'int', isSelected: true }
                    ]
                }
            }
        ];
        const sql = SqlGenerator.generateSqlFromGraph(nodes, [], '1');
        expect(sql).to.contain('SELECT u.Id FROM Users AS u');
    });

    it('should handle INNER JOINs between two tables', () => {
        const nodes = [
            {
                id: '1',
                data: {
                    tableName: 'Orders',
                    columns: [{ name: 'Id', type: 'int', isSelected: true }, { name: 'CustomerId', type: 'int', isSelected: false }]
                }
            },
            {
                id: '2',
                data: {
                    tableName: 'Customers',
                    columns: [{ name: 'Id', type: 'int', isSelected: false }, { name: 'FullName', type: 'nvarchar', isSelected: true }]
                }
            }
        ];
        const edges = [
            {
                id: 'e1-2',
                source: '1',
                target: '2',
                sourceHandle: 'out-CustomerId',
                targetHandle: 'in-Id',
                data: { joinType: 'INNER' }
            }
        ];

        const sql = SqlGenerator.generateSqlFromGraph(nodes, edges);
        expect(sql).to.contain('SELECT Orders.Id, Customers.FullName FROM Orders');
        expect(sql).to.contain('INNER JOIN Customers ON Orders.CustomerId = Customers.Id');
    });

    it('should apply filters (WHERE clause) with smart quoting', () => {
        const nodes = [
            {
                id: '1',
                data: {
                    tableName: 'Products',
                    columns: [
                        { name: 'Name', type: 'nvarchar', isSelected: true, filter: { operator: '=', value: 'Laptop' } },
                        { name: 'Stock', type: 'int', isSelected: true, filter: { operator: '>', value: '10' } }
                    ]
                }
            }
        ];
        const sql = SqlGenerator.generateSqlFromGraph(nodes, []);
        expect(sql).to.contain("WHERE Products.Name = 'Laptop' AND Products.Stock > 10");
    });

    it('should generate GROUP BY for aggregate functions', () => {
        const nodes = [
            {
                id: '1',
                data: {
                    tableName: 'Invoices',
                    columns: [
                        { name: 'Region', type: 'nvarchar', isSelected: true },
                        { name: 'Total', type: 'decimal', isSelected: true, function: 'SUM' }
                    ]
                }
            }
        ];
        const sql = SqlGenerator.generateSqlFromGraph(nodes, []);
        expect(sql).to.contain('SELECT Invoices.Region, SUM(Invoices.Total) FROM Invoices');
        expect(sql).to.contain('GROUP BY Invoices.Region');
    });

    it('should handle column aliases and handle collisions', () => {
        const nodes = [
            {
                id: '1',
                data: {
                    tableName: 'StoreA',
                    columns: [{ name: 'Price', type: 'decimal', isSelected: true, alias: 'Cost' }]
                }
            },
            {
                id: '2',
                data: {
                    tableName: 'StoreB',
                    columns: [{ name: 'Price', type: 'decimal', isSelected: true, alias: 'Cost' }]
                }
            }
        ];
        // Note: The generator uses connected components. If not joined, they are separate batches.
        const sql = SqlGenerator.generateSqlFromGraph(nodes, []);
        expect(sql).to.contain('SELECT StoreA.Price AS [Cost] FROM StoreA');
        expect(sql).to.contain('SELECT StoreB.Price AS [Cost] FROM StoreB');
    });

    it('should isolate batches when generating for a target component', () => {
        const nodes = [
            { id: '1', data: { tableName: 'TableA', columns: [{ name: 'Col1', type: 'int', isSelected: true }] } },
            { id: '2', data: { tableName: 'TableB', columns: [{ name: 'Col2', type: 'int', isSelected: true }] } }
        ];
        const sql = SqlGenerator.generateSqlFromGraph(nodes, [], '1');
        expect(sql).to.contain('TableA');
        expect(sql).to.not.contain('TableB');
    });

    it('should handle IS NULL and IS NOT NULL filters correctly', () => {
        const nodes = [
            {
                id: '1',
                data: {
                    tableName: 'Employees',
                    columns: [
                        { name: 'ManagerId', type: 'int', isSelected: true, filter: { operator: 'IS NULL' } }
                    ]
                }
            }
        ];
        const sql = SqlGenerator.generateSqlFromGraph(nodes, []);
        expect(sql).to.contain('WHERE Employees.ManagerId IS NULL');
    });
});
