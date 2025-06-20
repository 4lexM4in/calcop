// Скрипт для управления формулами

// Глобальные переменные
let currentFormula = null;

// Загрузка формул при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация обработчика для кнопки добавления формулы
    const addFormulaButton = document.getElementById('add-formula-button');
    if (addFormulaButton) {
        addFormulaButton.onclick = function() {
            openAddFormulaModal();
        };
    }
    
    // Загружаем формулы при переключении на вкладку формул
    const formulasTab = document.getElementById('tab-formulas');
    if (formulasTab) {
        formulasTab.addEventListener('click', function() {
            loadFormulas();
        });
        
        // Если вкладка формул активна при загрузке страницы, загружаем формулы сразу
        if (formulasTab.classList.contains('is-active')) {
            loadFormulas();
        }
    }
    
    // Инициализация обработчиков для кнопок тестирования
    const testConditionButton = document.getElementById('test-condition-button');
    if (testConditionButton) {
        testConditionButton.onclick = function() {
            openTestConditionModal();
        };
    }
    
    const testFormulaButton = document.getElementById('test-formula-button');
    if (testFormulaButton) {
        testFormulaButton.onclick = function() {
            openTestFormulaModal();
        };
    }
});

// Функция загрузки формул
function loadFormulas() {
    const tbody = document.getElementById('formulas-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="8" class="has-text-centered"><div class="mt-4 mb-4"><span class="icon is-large"><i class="fas fa-spinner fa-pulse fa-2x"></i></span><p class="mt-2">Загрузка данных...</p></div></td></tr>';
    
    // Выполняем GET-запрос на API
    fetch('/formulas/api/formulas')
        .then(response => {
            if (!response.ok) {
                throw new Error('HTTP error ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            console.log('Loaded formulas:', data);
            tbody.innerHTML = '';
            
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="has-text-centered">Нет данных</td></tr>';
                return;
            }
            
            data.forEach(formula => {
                const tr = document.createElement('tr');
                
                // ID
                const tdId = document.createElement('td');
                tdId.textContent = formula.id;
                tr.appendChild(tdId);
                
                // Название
                const tdName = document.createElement('td');
                tdName.textContent = formula.name;
                tr.appendChild(tdName);
                
                // Код условия
                const tdConditionCode = document.createElement('td');
                tdConditionCode.textContent = formula.condition_code;
                tr.appendChild(tdConditionCode);
                
                // Условие
                const tdCondition = document.createElement('td');
                tdCondition.textContent = formula.condition;
                tr.appendChild(tdCondition);
                
                // Условие выбора
                const tdSelectionCondition = document.createElement('td');
                if (formula.selection_condition) {
                    tdSelectionCondition.innerHTML = `<code>${formula.selection_condition}</code>`;
                } else {
                    tdSelectionCondition.innerHTML = '<span class="has-text-grey-light">не указано</span>';
                }
                tr.appendChild(tdSelectionCondition);
                
                // Формула расчета
                const tdFormula = document.createElement('td');
                tdFormula.innerHTML = `<code>${formula.formula}</code>`;
                tr.appendChild(tdFormula);
                
                // Пункт приказа
                const tdOrderPoint = document.createElement('td');
                tdOrderPoint.textContent = formula.order_point || '';
                tr.appendChild(tdOrderPoint);
                
                // Действия
                const tdActions = document.createElement('td');
                
                // Кнопка редактирования
                const editButton = document.createElement('button');
                editButton.className = 'button is-small is-info mr-1';
                editButton.innerHTML = '<span class="icon"><i class="fas fa-edit"></i></span>';
                editButton.title = 'Редактировать';
                editButton.onclick = function() { openEditFormulaModal(formula); };
                tdActions.appendChild(editButton);
                
                // Кнопка удаления
                const deleteButton = document.createElement('button');
                deleteButton.className = 'button is-small is-danger';
                deleteButton.innerHTML = '<span class="icon"><i class="fas fa-trash"></i></span>';
                deleteButton.title = 'Удалить';
                deleteButton.onclick = function() { openDeleteConfirmModal(formula); };
                tdActions.appendChild(deleteButton);
                
                tr.appendChild(tdActions);
                
                tbody.appendChild(tr);
            });
        })
        .catch(error => {
            console.error('Ошибка загрузки формул:', error);
            tbody.innerHTML = '<tr><td colspan="8" class="has-text-centered has-text-danger">Ошибка загрузки данных</td></tr>';
        });
}

// Открытие модального окна добавления формулы
function openAddFormulaModal() {
    document.getElementById('formula-modal-title').textContent = 'Добавление формулы';
    document.getElementById('formula-id').value = '';
    document.getElementById('formula-name').value = '';
    document.getElementById('formula-condition-code').value = '';
    document.getElementById('formula-condition').value = '';
    document.getElementById('formula-selection-condition').value = '';
    document.getElementById('formula-calculation').value = '';
    document.getElementById('formula-order-point').value = '';
    document.getElementById('formula-comment').value = '';
    
    document.getElementById('formula-modal').classList.add('is-active');
}

// Открытие модального окна редактирования формулы
function openEditFormulaModal(formula) {
    currentFormula = formula;
    
    document.getElementById('formula-modal-title').textContent = 'Редактирование формулы';
    document.getElementById('formula-id').value = formula.id;
    document.getElementById('formula-name').value = formula.name;
    document.getElementById('formula-condition-code').value = formula.condition_code;
    document.getElementById('formula-condition').value = formula.condition;
    document.getElementById('formula-selection-condition').value = formula.selection_condition || '';
    document.getElementById('formula-calculation').value = formula.formula;
    document.getElementById('formula-order-point').value = formula.order_point || '';
    document.getElementById('formula-comment').value = formula.comment || '';
    
    document.getElementById('formula-modal').classList.add('is-active');
}

// Закрытие модального окна формулы
function closeFormulaModal() {
    document.getElementById('formula-modal').classList.remove('is-active');
}

// Открытие модального окна тестирования условия выбора
function openTestConditionModal() {
    const selectionCondition = document.getElementById('formula-selection-condition').value;
    document.getElementById('test-condition-code').value = selectionCondition;
    document.getElementById('test-condition-result-container').classList.add('is-hidden');
    document.getElementById('test-condition-modal').classList.add('is-active');
}

// Закрытие модального окна тестирования условия выбора
function closeTestConditionModal() {
    document.getElementById('test-condition-modal').classList.remove('is-active');
}

// Тестирование условия выбора
function testCondition() {
    const condition = document.getElementById('test-condition-code').value;
    let testData;
    
    // Парсим тестовые данные из JSON
    try {
        testData = JSON.parse(document.getElementById('test-condition-data').value);
    } catch (e) {
        alert('Ошибка при разборе JSON тестовых данных: ' + e.message);
        return;
    }
    
    // Отправляем запрос на API для тестирования условия
    fetch('/formulas/api/test-condition', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
            condition: condition,
            test_data: testData
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`Error ${response.status}: ${text}`);
            });
        }
        return response.json();
    })
    .then(data => {
        const resultContainer = document.getElementById('test-condition-result-container');
        const resultEl = document.getElementById('test-condition-result');
        
        resultContainer.classList.remove('is-hidden');
        
        if (data.success) {
            resultEl.className = 'notification ' + (data.result ? 'is-success' : 'is-warning');
            resultEl.innerHTML = `<p class="has-text-weight-bold">Результат: ${data.result ? 'ИСТИНА' : 'ЛОЖЬ'}</p>`;
            resultEl.innerHTML += `<p>${data.result ? 'Условие выполняется для указанных данных' : 'Условие НЕ выполняется для указанных данных'}</p>`;
            
            // Если тест прошел успешно, обновляем значение условия в форме редактирования
            if (document.getElementById('formula-selection-condition').value !== condition) {
                document.getElementById('formula-selection-condition').value = condition;
            }
        } else {
            resultEl.className = 'notification is-danger';
            resultEl.innerHTML = `<p class="has-text-weight-bold">Ошибка при выполнении условия:</p><p>${data.error}</p>`;
        }
    })
    .catch(error => {
        const resultContainer = document.getElementById('test-condition-result-container');
        const resultEl = document.getElementById('test-condition-result');
        
        resultContainer.classList.remove('is-hidden');
        resultEl.className = 'notification is-danger';
        resultEl.innerHTML = `<p class="has-text-weight-bold">Ошибка при тестировании:</p><p>${error.message}</p>`;
    });
}

// Открытие модального окна тестирования формулы расчета
function openTestFormulaModal() {
    const formula = document.getElementById('formula-calculation').value;
    document.getElementById('test-formula-code').value = formula;
    document.getElementById('test-formula-result-container').classList.add('is-hidden');
    document.getElementById('test-formula-modal').classList.add('is-active');
}

// Закрытие модального окна тестирования формулы расчета
function closeTestFormulaModal() {
    document.getElementById('test-formula-modal').classList.remove('is-active');
}

// Тестирование формулы расчета
function testFormula() {
    const formula = document.getElementById('test-formula-code').value;
    let testData, normsData;
    
    // Парсим тестовые данные из JSON
    try {
        testData = JSON.parse(document.getElementById('test-formula-data').value);
    } catch (e) {
        alert('Ошибка при разборе JSON тестовых данных: ' + e.message);
        return;
    }
    
    // Парсим данные норм из JSON
    try {
        normsData = JSON.parse(document.getElementById('test-formula-norms').value);
    } catch (e) {
        alert('Ошибка при разборе JSON данных норм: ' + e.message);
        return;
    }
    
    // Отправляем запрос на API для тестирования формулы
    fetch('/formulas/api/test-formula', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
            formula: formula,
            test_data: testData,
            norms_data: normsData
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`Error ${response.status}: ${text}`);
            });
        }
        return response.json();
    })
    .then(data => {
        const resultContainer = document.getElementById('test-formula-result-container');
        const resultEl = document.getElementById('test-formula-result');
        
        resultContainer.classList.remove('is-hidden');
        
        if (data.success) {
            resultEl.className = 'notification is-success';
            resultEl.innerHTML = `<p class="has-text-weight-bold">Результат расчета: ${data.result}</p>`;
            
            // Если тест прошел успешно, обновляем значение формулы в форме редактирования
            if (document.getElementById('formula-calculation').value !== formula) {
                document.getElementById('formula-calculation').value = formula;
            }
        } else {
            resultEl.className = 'notification is-danger';
            resultEl.innerHTML = `<p class="has-text-weight-bold">Ошибка при выполнении формулы:</p><p>${data.error}</p>`;
        }
    })
    .catch(error => {
        const resultContainer = document.getElementById('test-formula-result-container');
        const resultEl = document.getElementById('test-formula-result');
        
        resultContainer.classList.remove('is-hidden');
        resultEl.className = 'notification is-danger';
        resultEl.innerHTML = `<p class="has-text-weight-bold">Ошибка при тестировании:</p><p>${error.message}</p>`;
    });
}

// Сохранение формулы
function saveFormula() {
    const form = document.getElementById('formula-form');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const formulaId = document.getElementById('formula-id').value;
    const formulaName = document.getElementById('formula-name').value;
    const formulaConditionCode = document.getElementById('formula-condition-code').value;
    const formulaCondition = document.getElementById('formula-condition').value;
    const formulaSelectionCondition = document.getElementById('formula-selection-condition').value;
    const formulaCalculation = document.getElementById('formula-calculation').value;
    const formulaOrderPoint = document.getElementById('formula-order-point').value;
    const formulaComment = document.getElementById('formula-comment').value;
    
    const formulaData = {
        name: formulaName,
        condition_code: formulaConditionCode,
        condition: formulaCondition,
        selection_condition: formulaSelectionCondition,
        formula: formulaCalculation,
        order_point: formulaOrderPoint,
        comment: formulaComment
    };
    
    const isEdit = formulaId !== '';
    const url = isEdit ? `/formulas/api/formulas/${formulaId}` : '/formulas/api/formulas';
    const method = isEdit ? 'PUT' : 'POST';
    
    console.log(`Saving formula: ${method} ${url}`, formulaData);
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(formulaData)
    })
    .then(response => {
        console.log('Response status:', response.status);
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`Error ${response.status}: ${text}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Save response:', data);
        closeFormulaModal();
        loadFormulas();
        
        showNotification(isEdit ? 'Формула успешно обновлена' : 'Формула успешно добавлена');
    })
    .catch(error => {
        console.error('Ошибка сохранения формулы:', error);
        alert('Произошла ошибка при сохранении формулы: ' + error.message);
    });
}

// Открытие модального окна подтверждения удаления
function openDeleteConfirmModal(formula) {
    currentFormula = formula;
    
    document.getElementById('delete-formula-name').textContent = formula.name;
    document.getElementById('delete-formula-id').value = formula.id;
    
    document.getElementById('confirm-delete-modal').classList.add('is-active');
}

// Закрытие модального окна подтверждения удаления
function closeConfirmModal() {
    document.getElementById('confirm-delete-modal').classList.remove('is-active');
}

// Удаление формулы
function deleteFormula() {
    const formulaId = document.getElementById('delete-formula-id').value;
    
    console.log(`Deleting formula: ${formulaId}`);
    
    fetch(`/formulas/api/formulas/${formulaId}`, {
        method: 'DELETE',
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => {
        console.log('Delete response status:', response.status);
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`Error ${response.status}: ${text}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Delete response:', data);
        closeConfirmModal();
        loadFormulas();
        
        showNotification('Формула успешно удалена');
    })
    .catch(error => {
        console.error('Ошибка удаления формулы:', error);
        alert('Произошла ошибка при удалении формулы: ' + error.message);
    });
}