
import re

result = { 'groups': [], 'teachers': [] }
all_states = list(result.keys())
current = 0

with open('groups.html', 'r', encoding="utf8") as f:
	for line in f:
		if '<option' in line:
			value = line[line.find('"') + 1: line.rfind('"')]
			name = line[line.find('>') + 1: line.rfind('<')]
			if name.strip() == 'Выберите преподавателя':
				current += 1

			result[ all_states[current] ].append({ 'name': name, 'value': value })

import json

with open('groups_and_teaches.json', 'w', encoding='utf8') as json_file:
    json.dump(result, json_file, ensure_ascii=False)
