import React, { useMemo } from 'react';
import { QueryBuilder, RuleGroupType, Field } from 'react-querybuilder';
import 'react-querybuilder/dist/query-builder.css';
import { Condition, getFieldsForTable } from '../../types/dataModels';

interface ConditionBuilderProps {
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
  tableName: string;
}

const ConditionBuilder: React.FC<ConditionBuilderProps> = ({ conditions, onChange, tableName }) => {
  const fields: Field[] = useMemo(() => {
    return getFieldsForTable(tableName).map(fieldName => ({
      name: fieldName,
      label: fieldName,
    }));
  }, [tableName]);

  const initialQuery: RuleGroupType = useMemo(() => ({
    combinator: 'and',
    rules: conditions.map(c => ({
      field: c.field,
      operator: c.operator,
      value: c.value,
    })),
  }), [conditions]);

  const handleQueryChange = (query: RuleGroupType) => {
    const newConditions: Condition[] = query.rules.flatMap(rule => {
      if ('field' in rule && 'operator' in rule && 'value' in rule) {
        return [{
          field: rule.field as string,
          operator: rule.operator as Condition['operator'],
          value: rule.value,
        }];
      }
      return [];
    });
    onChange(newConditions);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <QueryBuilder
        fields={fields}
        query={initialQuery}
        onQueryChange={handleQueryChange}
        controlClassnames={{
          queryBuilder: 'bg-gray-100 p-4 rounded',
          ruleGroup: 'bg-white p-4 rounded border border-gray-300 mb-4',
          combinators: 'ml-2 p-2 bg-white border border-gray-300 rounded',
          addRule: 'ml-2 p-2 bg-blue-500 text-white rounded',
          addGroup: 'ml-2 p-2 bg-green-500 text-white rounded',
          removeGroup: 'ml-2 p-2 bg-red-500 text-white rounded',
          removeRule: 'ml-2 p-2 bg-red-500 text-white rounded',
        }}
        controlElements={{
          fieldSelector: (props) => (
            <select {...props} className="p-2 bg-white border border-gray-300 rounded">
              {props.options.map(option => (
                <option key={('name' in option) ? option.name : option.label} value={('name' in option) ? option.name : option.label}>
                  {option.label}
                </option>
              ))}
            </select>
          ),
          operatorSelector: (props) => (
            <select {...props} className="ml-2 p-2 bg-white border border-gray-300 rounded">
              {props.options.map(option => (
                <option key={'name' in option ? option.name : option.label} value={'name' in option ? option.name : option.label}>
                  {option.label}
                </option>
              ))}
            </select>
          ),
          valueEditor: (props) => (
            <input
              {...props}
              type={props.type || 'text'}
              className="ml-2 p-2 bg-white border border-gray-300 rounded"
            />
          ),
        }}
      />
    </div>
  );
};

export default ConditionBuilder;