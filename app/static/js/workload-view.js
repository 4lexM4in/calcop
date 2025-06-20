// Скрипт для просмотра и редактирования расчета нагрузки

// Флаг режима редактирования
let isEditMode = false;

// Сохраненное состояние для отмены
let originalData = {};

// Флаги для отслеживания изменений
let hasUnsavedChanges = false;
let hasUnrecalculatedChanges = false;

// Функция переключения режима редактирования
function toggleEditMode() {
    isEditMode = !isEditMode;
    
    const table = document.getElementById('study-plan-table').parentElement;
    const editButton = document.getElementById('edit-mode-button');
    const saveButton = document.getElementById('save-changes-button');
    const recalculateButton = document.getElementById('recalculate-button');
    const cancelButton = document.getElementById('cancel-edit-button');
    const totalLabel = document.getElementById('total-label');
    
    if (isEditMode) {
        // Включаем режим редактирования
        table.classList.add('edit-mode');
        editButton.style.display = 'none';
        saveButton.style.display = 'inline-flex';
        recalculateButton.style.display = 'inline-flex';
        cancelButton.style.display = 'inline-flex';
        
        // Сохраняем исходные данные
        saveOriginalData();
        
        // Сбрасываем флаги изменений
        hasUnsavedChanges = false;
        hasUnrecalculatedChanges = false;
        
        // Блокируем кнопку сохранения изначально
        updateSaveButtonState();
        
        // Добавляем обработчики изменений ко всем инпутам
        addChangeListeners();
        
        // Обновляем колспан для итогов
        if (totalLabel) {
            totalLabel.setAttribute('colspan', '11');
        }
    } else {
        // Выключаем режим редактирования
        table.classList.remove('edit-mode');
        editButton.style.display = 'inline-flex';
        saveButton.style.display = 'none';
        recalculateButton.style.display = 'none';
        cancelButton.style.display = 'none';
        
        // Удаляем обработчики изменений
        removeChangeListeners();
        
        // Сбрасываем флаги
        hasUnsavedChanges = false;
        hasUnrecalculatedChanges = false;
        
        // Удаляем предупреждение о пересчете
        removeRecalculationWarning();
        
        // Обновляем колспан для итогов
        if (totalLabel) {
            totalLabel.setAttribute('colspan', '11');
        }
    }
    
    // Обновляем индикатор несохраненных изменений
    updateUnsavedChangesIndicator();
}

// Функция сохранения исходных данных
function saveOriginalData() {
    originalData = {};
    
    // Сохраняем значения всех инпутов
    document.querySelectorAll('.edit-mode-input').forEach(input => {
        if (input.tagName === 'INPUT') {
            if (input.type === 'checkbox') {
                originalData[input.name] = input.checked;
            } else {
                originalData[input.name] = input.value;
            }
        }
    });
    
    // Сохраняем значения чекбоксов "Учитывать"
    document.querySelectorAll('.consider-checkbox').forEach(checkbox => {
        originalData[checkbox.name] = checkbox.checked;
    });
}

// Функция восстановления исходных данных при отмене
function restoreOriginalData() {
    Object.keys(originalData).forEach(name => {
        const element = document.querySelector(`[name="${name}"]`);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = originalData[name];
            } else {
                element.value = originalData[name];
            }
            
            // Удаляем визуальную индикацию изменения
            element.classList.remove('has-changes');
        }
    });
}

// Функция добавления обработчиков изменений
function addChangeListeners() {
    // Обработчики для всех инпутов в режиме редактирования
    document.querySelectorAll('.edit-mode-input').forEach(input => {
        if (input.tagName === 'INPUT') {
            if (input.type === 'checkbox') {
                input.addEventListener('change', onInputChange);
            } else {
                input.addEventListener('input', onInputChange);
            }
        }
    });
    
    // Обработчик для чекбоксов "Учитывать"
    document.querySelectorAll('.consider-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', onInputChange);
    });
}

// Функция удаления обработчиков изменений
function removeChangeListeners() {
    document.querySelectorAll('.edit-mode-input').forEach(input => {
        if (input.tagName === 'INPUT') {
            input.removeEventListener('change', onInputChange);
            input.removeEventListener('input', onInputChange);
        }
    });
    
    document.querySelectorAll('.consider-checkbox').forEach(checkbox => {
        checkbox.removeEventListener('change', onInputChange);
    });
}

// Обработчик изменений в инпутах
function onInputChange(event) {
    const input = event.target;
    const originalValue = originalData[input.name];
    let currentValue;
    
    if (input.type === 'checkbox') {
        currentValue = input.checked;
    } else {
        currentValue = input.value;
    }
    
    // Проверяем, изменилось ли значение
    const hasChanged = originalValue !== currentValue;
    
    if (hasChanged) {
        hasUnsavedChanges = true;
        hasUnrecalculatedChanges = true;
        
        // Добавляем визуальную индикацию изменения
        input.classList.add('has-changes');
        
        // Показываем предупреждение о необходимости пересчета
        showRecalculationWarning();
    } else {
        input.classList.remove('has-changes');
    }
    
    // Проверяем, есть ли вообще изменения
    checkForAnyChanges();
    updateSaveButtonState();
    updateUnsavedChangesIndicator();
}

// Функция проверки наличия любых изменений
function checkForAnyChanges() {
    hasUnsavedChanges = false;
    hasUnrecalculatedChanges = false;
    
    document.querySelectorAll('.edit-mode-input, .consider-checkbox').forEach(input => {
        const originalValue = originalData[input.name];
        let currentValue;
        
        if (input.type === 'checkbox') {
            currentValue = input.checked;
        } else {
            currentValue = input.value;
        }
        
        if (originalValue !== currentValue) {
            hasUnsavedChanges = true;
            hasUnrecalculatedChanges = true;
        }
    });
}

// Функция обновления состояния кнопки сохранения
function updateSaveButtonState() {
    const saveButton = document.getElementById('save-changes-button');
    const recalculateButton = document.getElementById('recalculate-button');
    
    if (!saveButton) return;
    
    if (!hasUnsavedChanges) {
        // Нет изменений - кнопка заблокирована
        saveButton.disabled = true;
        saveButton.title = 'Нет изменений для сохранения';
        saveButton.classList.add('is-static');
        recalculateButton.classList.remove('is-pulsing');
    } else if (hasUnrecalculatedChanges) {
        // Есть непересчитанные изменения - кнопка заблокирована
        saveButton.disabled = true;
        saveButton.title = 'Сначала пересчитайте данные';
        saveButton.classList.add('is-static');
        recalculateButton.classList.add('is-pulsing');
    } else {
        // Изменения есть и пересчитаны - кнопка доступна
        saveButton.disabled = false;
        saveButton.title = 'Сохранить изменения';
        saveButton.classList.remove('is-static');
        recalculateButton.classList.remove('is-pulsing');
    }
}

// Функция показа предупреждения о необходимости пересчета
function showRecalculationWarning() {
    // Удаляем предыдущее предупреждение, если оно есть
    const existingWarning = document.getElementById('recalculation-warning');
    if (existingWarning) {
        return; // Предупреждение уже показано
    }
    
    // Создаем новое предупреждение
    const warning = document.createElement('div');
    warning.id = 'recalculation-warning';
    warning.className = 'notification is-warning is-light mb-3';
    warning.innerHTML = `
        <button class="delete" onclick="this.parentElement.remove()"></button>
        <strong>Внимание!</strong> Вы изменили данные в полях ввода. 
        Для корректного сохранения необходимо пересчитать данные, нажав кнопку "Пересчитать".
    `;
    
    // Вставляем предупреждение перед таблицей
    const tableBox = document.querySelector('.box.shadow');
    if (tableBox) {
        tableBox.parentNode.insertBefore(warning, tableBox);
    }
}

// Функция удаления предупреждения о пересчете
function removeRecalculationWarning() {
    const warning = document.getElementById('recalculation-warning');
    if (warning) {
        warning.remove();
    }
}

// Функция обновления индикатора несохраненных изменений
function updateUnsavedChangesIndicator() {
    const level = document.getElementById('action-buttons-level');
    if (hasUnsavedChanges && isEditMode) {
        level.classList.add('has-unsaved-changes');
    } else {
        level.classList.remove('has-unsaved-changes');
    }
}

// Функция отмены редактирования
function cancelEdit() {
    if (hasUnsavedChanges) {
        if (confirm('У вас есть несохраненные изменения. Вы уверены, что хотите отменить редактирование?')) {
            restoreOriginalData();
            removeRecalculationWarning();
            toggleEditMode();
        }
    } else {
        toggleEditMode();
    }
}

// Функция пересчета нагрузки
function recalculate() {
    // Показываем индикатор загрузки
    showNotification('Выполняется пересчет...', 'is-info');
    
    // Собираем данные формы
    const formData = new FormData();
    const workloadId = document.querySelector('input[name="workload_id"]').value;
    formData.append('workload_id', workloadId);
    
    // Собираем все инпуты
    document.querySelectorAll('.edit-mode-input').forEach(element => {
        if (element.tagName === 'INPUT') {
            if (element.type === 'checkbox') {
                formData.append(element.name, element.checked ? 'on' : 'off');
            } else {
                formData.append(element.name, element.value);
            }
        }
    });
    
    // Собираем также значения для всех строк (включая скрытые)
    document.querySelectorAll('#study-plan-table tbody tr').forEach(tr => {
        const rowId = tr.getAttribute('data-row-id');
        if (rowId) {
            const checkbox = tr.querySelector('.consider-checkbox');
            if (checkbox) {
                formData.append(checkbox.name, checkbox.checked ? 'on' : 'off');
            }
            
            // Добавляем значения инпутов
            tr.querySelectorAll('input.edit-mode-input').forEach(input => {
                formData.append(input.name, input.value);
            });
        }
    });
    
    // Отправляем данные на сервер
    fetch(`/workload/recalculate/${workloadId}`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // После успешного пересчета на сервере получаем обновленные данные
            fetch(`/workload/get_full_data/${workloadId}`)
                .then(response => response.json())
                .then(result => {
                    if (result.success && result.calculated_data) {
                        updateTableWithNewData(result.calculated_data);
                        showNotification('Пересчет выполнен успешно', 'is-success');
                        
                        // Сбрасываем флаг непересчитанных изменений
                        hasUnrecalculatedChanges = false;
                        removeRecalculationWarning();
                        
                        // Удаляем визуальные индикаторы изменений
                        document.querySelectorAll('.has-changes').forEach(input => {
                            input.classList.remove('has-changes');
                        });
                        
                        // Обновляем состояние кнопки сохранения
                        updateSaveButtonState();
                    } else {
                        showNotification('Ошибка при обновлении данных', 'is-danger');
                    }
                })
                .catch(error => {
                    showNotification('Ошибка при обновлении таблицы', 'is-danger');
                });
        } else {
            showNotification('Ошибка при пересчете: ' + (data.error || 'Неизвестная ошибка'), 'is-danger');
        }
    })
    .catch(error => {
        showNotification('Ошибка при пересчете: ' + error.message, 'is-danger');
    });
}

// Функция обновления таблицы с новыми данными
function updateTableWithNewData(calculatedData) {
    let totalWorkload = 0;
    
    calculatedData.forEach(row => {
        const rowId = `${row['Индекс дисциплины']}_${row['Вид работы']}_${row['Семестр']}`;
        const tr = document.querySelector(`tr[data-row-id="${rowId}"]`);
        
        if (tr) {
            // Обновляем нагрузку (13-й столбец)
            const workloadCell = tr.cells[12];
            if (workloadCell) {
                const newValue = row['Нагрузка'];
                workloadCell.textContent = newValue;
                workloadCell.className = 'has-text-weight-bold';
                
                if (newValue > 0) {
                    workloadCell.classList.add('has-text-primary');
                } else {
                    workloadCell.classList.remove('has-text-primary');
                }
            }
            
            // Обновляем пункт приказа (14-й столбец)
            const orderCell = tr.cells[13];
            if (orderCell) {
                orderCell.textContent = row['Пункт приказа'] || '';
            }
            
            // Добавляем к общей сумме, если строка учитывается
            if (row['Учитывать']) {
                totalWorkload += parseFloat(row['Нагрузка']) || 0;
            }
        }
    });
    
    // Обновляем итоговую сумму в футере таблицы
    const totalCell = document.querySelector('#study-plan-table tfoot td.has-text-weight-bold');
    if (totalCell) {
        totalCell.textContent = totalWorkload.toFixed(2);
    }
    
    // Обновляем карточки с результатами
    const contingent = parseInt(document.querySelector('input[name="workload_id"]').closest('form').dataset.contingent || 25);
    const normHours = 900; // Можно получить из данных
    updateSummaryCards(totalWorkload, contingent, normHours);
}

// Функция сохранения изменений
function saveChanges() {
    if (!hasUnsavedChanges) {
        showNotification('Нет изменений для сохранения', 'is-warning');
        return;
    }
    
    if (hasUnrecalculatedChanges) {
        showNotification('Сначала пересчитайте данные, а затем сохраните', 'is-warning');
        return;
    }
    
    const workloadId = document.querySelector('input[name="workload_id"]').value;
    const formData = new FormData();
    formData.append('workload_id', workloadId);
    
    // Собираем все данные
    document.querySelectorAll('.edit-mode-input').forEach(element => {
        if (element.tagName === 'INPUT') {
            if (element.type === 'checkbox') {
                formData.append(element.name, element.checked ? 'on' : 'off');
            } else {
                formData.append(element.name, element.value);
            }
        }
    });
    
    // Собираем чекбоксы "Учитывать"
    document.querySelectorAll('.consider-checkbox').forEach(checkbox => {
        formData.append(checkbox.name, checkbox.checked ? 'on' : 'off');
    });
    
    // Отправляем на сервер
    fetch(`/workload/update/${workloadId}`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Изменения успешно сохранены', 'is-success');
            
            // Сбрасываем флаги изменений
            hasUnsavedChanges = false;
            hasUnrecalculatedChanges = false;
            
            // Выходим из режима редактирования
            toggleEditMode();
            
            // Перезагружаем страницу для обновления данных
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showNotification('Ошибка при сохранении: ' + data.error, 'is-danger');
        }
    })
    .catch(error => {
        showNotification('Ошибка при сохранении изменений', 'is-danger');
    });
}

// Функция экспорта в Excel
function exportToExcel() {
    const workloadId = document.querySelector('input[name="workload_id"]').value;
    window.location.href = `/workload/export_excel/${workloadId}`;
}

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    // Предупреждение при попытке покинуть страницу с несохраненными изменениями
    window.addEventListener('beforeunload', function(e) {
        if (hasUnsavedChanges && isEditMode) {
            e.preventDefault();
            e.returnValue = 'У вас есть несохраненные изменения. Вы уверены, что хотите покинуть страницу?';
            return e.returnValue;
        }
    });
    
    // Обработчик для клавиши Escape - отмена редактирования
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isEditMode) {
            cancelEdit();
        }
    });
    
    // Обработчик для Ctrl+S - сохранение изменений
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 's' && isEditMode) {
            e.preventDefault();
            if (!hasUnrecalculatedChanges && hasUnsavedChanges) {
                saveChanges();
            }
        }
    });
    
    // Инициализируем обработчик изменения чекбоксов учитывания
    document.querySelectorAll('.consider-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateCommentsField(this);
            if (isEditMode) {
                onInputChange({ target: this });
            }
        });
    });
});