class SeatingChartApp {
      constructor() {
        this.classes = [];
        this.currentClassId = null;
        this.isEditMode = false;
        this.isClassListEditMode = false;
        this.isAttendanceView = false;
        
        this.draggedStudentName = null;
        this.sourceGroupIndex = null;
        this.draggedGroupIndex = null;
        this.isFullScreen = false;
        this.selectedAttendanceDate = new Date();
        this.calendarViewMonth = new Date().getMonth();
        this.calendarViewYear = new Date().getFullYear();
        this.activeTakeAttendanceMode = null;
        this.isGradeScoringActive = false;
        this.activeGradeSession = { title: 'Singing', date: '', scores: {} };
        this.isDraftScoringActive = false;
        this.draftGradeColumn = null;
        this.draggedGradeColIndex = null;
        this.suppressRemoveStudentWarning = localStorage.getItem('seatingApp_suppressRemoveStudentWarning') === 'true';
        this.studentPendingRemoval = null;
        this.appName = localStorage.getItem('seatingApp_appName') || 'ClassPlanner';
        this.settingShowFaces = true;
        this.settingShowGradesRatio = true;

        this.init();
      }

      updateAppTitle() {
        const titleText = (this.appName && this.appName.trim()) ? this.appName.trim() : 'ClassPlanner';
        const brandEl = document.getElementById('appTitleBrandText');
        if (brandEl) brandEl.textContent = titleText;
        document.title = `${titleText} 1.0`;
      }

      init() {
        this.loadData();
        this.updateAppTitle();

        if (this.classes.length === 0) {
          this.createSampleData();
        }

        if (!this.currentClassId || !this.classes.some(c => c.id === this.currentClassId)) {
          this.currentClassId = this.classes[0] ? this.classes[0].id : null;
        }

        window.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && this.isFullScreen) {
            this.toggleFullScreen(false);
          }
        });

        // Close secondary layout menu when clicking outside of it
        window.addEventListener('click', (e) => {
          const layoutBar = document.getElementById('layoutBar');
          const layoutBtn = document.getElementById('headerLayoutBtn');
          if (layoutBar && layoutBar.classList.contains('open')) {
            if (e.target && !layoutBar.contains(e.target) && !layoutBtn.contains(e.target)) {
              this.closeLayoutMenu();
            }
          }
        });

        this.renderClassDropdown();
        this.render();
      }

      toggleLayoutMenu(e) {
        if (e) e.stopPropagation();
        const layoutBar = document.getElementById('layoutBar');
        const layoutBtn = document.getElementById('headerLayoutBtn');
        if (!layoutBar) return;

        const isOpen = layoutBar.classList.contains('open');
        if (isOpen) {
          this.closeLayoutMenu();
        } else {
          layoutBar.classList.add('open');
          if (layoutBtn) {
            layoutBtn.classList.remove('btn-outline');
            layoutBtn.classList.add('btn-primary');
          }
        }
        this.updateSubheaders();
      }

      closeLayoutMenu() {
        const layoutBar = document.getElementById('layoutBar');
        const layoutBtn = document.getElementById('headerLayoutBtn');
        if (layoutBar) layoutBar.classList.remove('open');
        if (layoutBtn) {
          layoutBtn.classList.remove('btn-primary');
          layoutBtn.classList.add('btn-outline');
        }
        this.updateSubheaders();
      }

      toggleFullScreen(forceState) {
        this.isFullScreen = typeof forceState === 'boolean' ? forceState : !this.isFullScreen;

        const btnResize = document.getElementById('btnResize');

        if (this.isFullScreen) {
          document.body.classList.add('fullscreen-mode');
          if (btnResize) btnResize.classList.add('btn-resize-active');
        } else {
          document.body.classList.remove('fullscreen-mode');
          if (btnResize) btnResize.classList.remove('btn-resize-active');
        }
      }

      createSampleData() {
        const sampleStudents = [
          'George Washington', 'John Adams', 'Thomas Jefferson', 'James Madison', 'James Monroe',
          'John Quincy Adams', 'Andrew Jackson', 'Martin Van Buren', 'William Henry Harrison', 'John Tyler',
          'James Polk', 'Zachary Taylor', 'Millard Fillmore', 'Franklin Pierce', 'James Buchanan',
          'Abraham Lincoln', 'Andrew Johnson', 'Ulysses Grant', 'Rutherford Hayes', 'James Garfield',
          'Chester Arthur', 'Grover Cleveland', 'Benjamin Harrison', 'Grover Cleveland', 'William McKinley',
          'Theodore Roosevelt', 'William Howard Taft', 'Woodrow Wilson', 'Warren Harding', 'Calvin Coolidge',
          'Herbert Hoover', 'Franklin Roosevelt', 'Harry Truman', 'Dwight Eisenhower', 'John Kennedy',
          'Lyndon Johnson', 'Richard Nixon', 'Gerald Ford', 'Jimmy Carter', 'Ronald Reagan',
          'George Bush', 'Bill Clinton', 'George Bush', 'Barack Obama', 'Donald Trump',
          'Joe Biden', 'Donald Trump'
        ];

        const numRows = 4;
        const rows = Array.from({ length: numRows }, () => []);
        sampleStudents.forEach((st, i) => {
          rows[i % numRows].push(st);
        });

        const sampleClass = {
          id: 'class-' + Date.now(),
          name: 'US Presidents',
          layout: 'rows',
          rowsCount: 4,
          rowAlignment: 'center',
          rowsRowAlign: {},
          showFaces: true,
          classList: [...sampleStudents],
          rows: rows,
          circle: [...sampleStudents],
          layoutsData: {
            half: this.autoBalanceGroups([...sampleStudents], 2),
            third: this.autoBalanceGroups([...sampleStudents], 3),
            fourth: this.autoBalanceGroups([...sampleStudents], 4),
            fifth: this.autoBalanceGroups([...sampleStudents], 5),
            sixth: this.autoBalanceGroups([...sampleStudents], 6)
          }
        };
        this.classes.push(sampleClass);
        this.currentClassId = sampleClass.id;
        this.saveData();
      }

      autoBalanceGroups(students, numGroups) {
        const groups = Array.from({ length: numGroups }, () => []);
        students.forEach((name, i) => {
          groups[i % numGroups].push(name);
        });
        return groups;
      }

      saveData() {
        localStorage.setItem('seatingPlanner_data_v5', JSON.stringify(this.classes));
        localStorage.setItem('seatingPlanner_currentId_v5', this.currentClassId);
      }

      loadData() {
        const savedClasses = localStorage.getItem('seatingPlanner_data_v5');
        const savedId = localStorage.getItem('seatingPlanner_currentId_v5');

        if (savedClasses) {
          try {
            this.classes = JSON.parse(savedClasses);
            if (!Array.isArray(this.classes)) this.classes = [];
            this.classes.forEach(c => {
              if (!c) return;
              if (!Array.isArray(c.rows)) c.rows = [[]];
              c.rows = c.rows.map(r => Array.isArray(r) ? r.filter(s => typeof s === 'string' && s.trim()) : []);
              if (!c.rowsCount) c.rowsCount = 4;
              if (!c.linesCount) c.linesCount = 4;
              if (!c.rowAlignment) c.rowAlignment = 'center';
              if (!c.rowsRowAlign) c.rowsRowAlign = {};
              if (typeof c.showFaces !== 'boolean') c.showFaces = true;
              if (!Array.isArray(c.unplacedStudents)) c.unplacedStudents = [];

              const all = this.getAllClassStudents(c);
              if (!c.classList || !Array.isArray(c.classList)) c.classList = [...all];
              else c.classList = c.classList.filter(s => typeof s === 'string' && s.trim());

              if (!c.circle || !Array.isArray(c.circle)) c.circle = [...all];
              else c.circle = c.circle.filter(s => typeof s === 'string' && s.trim());

              if (!c.layoutsData || typeof c.layoutsData !== 'object') c.layoutsData = {};

              if (!c.layoutsData.half || !Array.isArray(c.layoutsData.half) || c.layoutsData.half.length < 2 || c.layoutsData.half.flat().length === 0) c.layoutsData.half = this.autoBalanceGroups([...all], 2);
              if (!c.layoutsData.third || !Array.isArray(c.layoutsData.third) || c.layoutsData.third.length < 3 || c.layoutsData.third.flat().length === 0) c.layoutsData.third = this.autoBalanceGroups([...all], 3);
              if (!c.layoutsData.fourth || !Array.isArray(c.layoutsData.fourth) || c.layoutsData.fourth.length < 4 || c.layoutsData.fourth.flat().length === 0) c.layoutsData.fourth = this.autoBalanceGroups([...all], 4);
              if (!c.layoutsData.fifth || !Array.isArray(c.layoutsData.fifth) || c.layoutsData.fifth.length < 5 || c.layoutsData.fifth.flat().length === 0) c.layoutsData.fifth = this.autoBalanceGroups([...all], 5);
              if (!c.layoutsData.sixth || !Array.isArray(c.layoutsData.sixth) || c.layoutsData.sixth.length < 6 || c.layoutsData.sixth.flat().length === 0) c.layoutsData.sixth = this.autoBalanceGroups([...all], 6);
            });
            this.currentClassId = savedId;
          } catch (e) {
            this.classes = [];
          }
        }
      }

      getAllClassStudents(c) {
        if (!c) return [];
        let set = new Set();
        if (c.classList && Array.isArray(c.classList)) {
          c.classList.forEach(s => { if (typeof s === 'string' && s.trim()) set.add(s.trim()); });
        }
        if (c.rows && Array.isArray(c.rows)) {
          c.rows.forEach(r => {
            if (Array.isArray(r)) r.forEach(s => { if (typeof s === 'string' && s.trim()) set.add(s.trim()); });
          });
        }
        if (c.circle && Array.isArray(c.circle)) {
          c.circle.forEach(s => { if (typeof s === 'string' && s.trim()) set.add(s.trim()); });
        }
        if (c.layoutsData && typeof c.layoutsData === 'object') {
          Object.values(c.layoutsData).forEach(gArr => {
            if (Array.isArray(gArr)) {
              gArr.forEach(g => {
                if (Array.isArray(g)) g.forEach(s => { if (typeof s === 'string' && s.trim()) set.add(s.trim()); });
              });
            }
          });
        }
        return Array.from(set);
      }

      getCurrentClass() {
        return this.classes.find(c => c.id === this.currentClassId);
      }

      toggleBalanceSetting() {
        this.shouldBalanceClass = !this.shouldBalanceClass;
        const btn = document.getElementById('btnBalanceToggle');
        if (btn) {
          if (this.shouldBalanceClass) {
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-primary');
          } else {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
          }
        }
      }

      openSettingsModal() {
        const currentClass = this.getCurrentClass();
        if (!currentClass) return;

        this.shouldBalanceClass = false;
        const btn = document.getElementById('btnBalanceToggle');
        if (btn) {
          btn.classList.remove('btn-primary');
          btn.classList.add('btn-secondary');
        }

        const appNameEl = document.getElementById('settingsAppName');
        if (appNameEl) appNameEl.value = this.appName || 'ClassPlanner';

        this.settingShowFaces = (currentClass.showFaces !== false);
        this.settingShowGradesRatio = (currentClass.showGradesAttendanceRatio !== false);
        this.updateSettingsToggleUI('btnToggleShowFaces', this.settingShowFaces);
        this.updateSettingsToggleUI('btnToggleShowGradesRatio', this.settingShowGradesRatio);
        this.updateSettingsToggleUI('btnToggleRemoveWarning', !this.suppressRemoveStudentWarning);

        document.getElementById('settingsModal').classList.add('active');
      }

      updateSettingsToggleUI(btnId, isActive) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        if (isActive) {
          btn.textContent = 'ON';
          btn.style.cssText = 'font-weight: 700; padding: 6px 16px; background: #38bdf8; color: white; border: 1.5px solid #0284c7; min-width: 70px; cursor: pointer; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);';
        } else {
          btn.textContent = 'OFF';
          btn.style.cssText = 'font-weight: 700; padding: 6px 16px; background: #e2e8f0; color: #64748b; border: 1.5px solid #cbd5e1; min-width: 70px; cursor: pointer; border-radius: 6px;';
        }
      }

      toggleShowFacesSetting() {
        this.settingShowFaces = !this.settingShowFaces;
        this.updateSettingsToggleUI('btnToggleShowFaces', this.settingShowFaces);
      }

      toggleShowGradesRatioSetting() {
        this.settingShowGradesRatio = !this.settingShowGradesRatio;
        this.updateSettingsToggleUI('btnToggleShowGradesRatio', this.settingShowGradesRatio);
      }

      toggleRemoveWarningSetting() {
        this.suppressRemoveStudentWarning = !this.suppressRemoveStudentWarning;
        const isWarningActive = !this.suppressRemoveStudentWarning;
        this.updateSettingsToggleUI('btnToggleRemoveWarning', isWarningActive);
      }

      shuffleArray(arr) {
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      }

      saveSettings() {
        const currentClass = this.getCurrentClass();
        if (!currentClass) return;

        const appNameEl = document.getElementById('settingsAppName');
        if (appNameEl) {
          const newName = appNameEl.value.trim();
          this.appName = newName || 'ClassPlanner';
          localStorage.setItem('seatingApp_appName', this.appName);
          this.updateAppTitle();
        }

        currentClass.showFaces = this.settingShowFaces;
        currentClass.showGradesAttendanceRatio = this.settingShowGradesRatio;
        localStorage.setItem('seatingApp_suppressRemoveStudentWarning', this.suppressRemoveStudentWarning.toString());

        const rowCountEl = document.getElementById('settingsRowCount');
        if (rowCountEl) {
          const count = parseInt(rowCountEl.value, 10);
          if (count >= 1 && count <= 6 && count !== currentClass.rowsCount) {
            this.setRowsCount(count);
          }
        }

        const lineCountEl = document.getElementById('settingsLineCount');
        if (lineCountEl) {
          const lineCount = parseInt(lineCountEl.value, 10);
          if (lineCount >= 1 && lineCount <= 6 && lineCount !== currentClass.linesCount) {
            this.setLinesCount(lineCount);
          }
        }

        const divideRowsEl = document.getElementById('settingsDivideRows');
        if (divideRowsEl) {
          currentClass.divideRows = divideRowsEl.value === 'true';
        }

        const showFacesEl = document.getElementById('settingsShowFaces');
        if (showFacesEl) {
          currentClass.showFaces = showFacesEl.value === 'true';
        }

        const showGradesRatioEl = document.getElementById('settingsShowGradesAttendanceRatio');
        if (showGradesRatioEl) {
          currentClass.showGradesAttendanceRatio = showGradesRatioEl.value === 'true';
        }

        const suppressWarningEl = document.getElementById('settingsSuppressRemoveWarning');
        if (suppressWarningEl) {
          this.suppressRemoveStudentWarning = (suppressWarningEl.value === 'true');
          localStorage.setItem('seatingApp_suppressRemoveStudentWarning', this.suppressRemoveStudentWarning.toString());
        }

        if (this.shouldBalanceClass) {
          const allStudents = this.shuffleArray(this.getAllStudents());
          const layout = currentClass.layout;

          if (layout === 'circle') {
            currentClass.circle = [...allStudents];
          } else if (layout === 'lines') {
            const numLines = currentClass.linesCount || 4;
            currentClass.lines = this.autoBalanceGroups(allStudents, numLines);
          } else if (['half', 'third', 'fourth', 'fifth', 'sixth'].includes(layout)) {
            const numGroups = layout === 'half' ? 2 : layout === 'third' ? 3 : layout === 'fourth' ? 4 : layout === 'fifth' ? 5 : 6;
            currentClass.layoutsData[layout] = this.autoBalanceGroups(allStudents, numGroups);
          } else {
            // Rows layout
            if (currentClass.divideRows) {
              const numSections = currentClass.rowsCount * 2;
              const balanced = Array.from({ length: numSections }, () => []);
              allStudents.forEach((st, i) => {
                balanced[i % numSections].push(st);
              });
              currentClass.dividedRowsData = [];
              for (let r = 0; r < currentClass.rowsCount; r++) {
                currentClass.dividedRowsData.push([balanced[r * 2] || [], balanced[r * 2 + 1] || []]);
              }
            } else {
              const numRows = currentClass.rowsCount;
              currentClass.rows = Array.from({ length: numRows }, () => []);
              allStudents.forEach((st, i) => {
                currentClass.rows[i % numRows].push(st);
              });
            }
          }
        }

        this.saveData();
        this.render();
        this.closeModal('settingsModal');
      }

      downloadClassPlanner() {
        const todayStr = new Date().toISOString().slice(0, 10);
        const defaultFilename = `ClassPlanner_Backup_${todayStr}.json`;
        const userFilename = prompt('Enter a file name for your ClassPlanner backup:', defaultFilename);
        if (userFilename === null) return;

        let filename = userFilename.trim();
        if (!filename) filename = defaultFilename;
        if (!filename.toLowerCase().endsWith('.json')) {
          filename += '.json';
        }

        const exportPayload = {
          app: 'ClassPlanner',
          version: '1.0',
          exportedAt: new Date().toISOString(),
          currentClassId: this.currentClassId,
          classes: this.classes
        };

        const jsonStr = JSON.stringify(exportPayload, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      triggerUploadPlanner() {
        const fileInput = document.getElementById('plannerFileInput');
        if (fileInput) {
          fileInput.value = '';
          fileInput.click();
        }
      }

      handleUploadPlanner(e) {
        const file = (e && e.target && e.target.files) ? e.target.files[0] : null;
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const importedData = JSON.parse(event.target.result);

            if (!importedData || (!Array.isArray(importedData.classes) && !Array.isArray(importedData))) {
              alert('Invalid ClassPlanner file. Please select a valid .json backup file.');
              return;
            }

            const confirmReplace = confirm('Are you sure you want to replace all current class data with the imported ClassPlanner file?');
            if (!confirmReplace) return;

            if (Array.isArray(importedData.classes)) {
              this.classes = importedData.classes;
              if (importedData.currentClassId && this.classes.some(c => c.id === importedData.currentClassId)) {
                this.currentClassId = importedData.currentClassId;
              } else if (this.classes[0]) {
                this.currentClassId = this.classes[0].id;
              }
            } else if (Array.isArray(importedData)) {
              this.classes = importedData;
              if (this.classes[0]) this.currentClassId = this.classes[0].id;
            }

            this.saveData();
            this.closeModal('settingsModal');
            this.render();
            if (this.currentViewMode === 'attendance') this.renderAttendanceTable();
            if (this.currentViewMode === 'grades') this.renderGradesTable();

            alert('ClassPlanner data successfully restored!');
          } catch (err) {
            console.error('Error parsing JSON backup file:', err);
            alert('Failed to read the file. Please ensure it is a valid ClassPlanner .json backup.');
          }
        };

        reader.readAsText(file);
      }

      deleteClassPlanner() {
        const warningMsg = '⚠️ PERMANENT DELETION WARNING!\n\nAre you sure you want to delete all ClassPlanner data?\n\nThis will permanently delete all your classes, student rosters, seating charts, attendance records, and gradebook data. This action is IRREVERSIBLE.\n\n(Note: Downloaded ClassPlanner backup files can be uploaded at a later point to restore your data.)\n\nClick OK to confirm permanent deletion.';

        if (!confirm(warningMsg)) return;

        try {
          localStorage.clear();
        } catch (e) {
          console.error('Error clearing localStorage:', e);
        }

        this.classes = [];
        this.currentClassId = null;
        this.isEditMode = false;
        this.isGradeScoringActive = false;
        this.isDraftScoringActive = false;
        this.draftGradeColumn = null;
        this.suppressRemoveStudentWarning = false;
        this.appName = 'ClassPlanner';
        this.updateAppTitle();

        this.createSampleData();

        this.closeModal('settingsModal');
        this.render();
        if (this.currentViewMode === 'attendance') this.renderAttendanceTable();
        if (this.currentViewMode === 'grades') this.renderGradesTable();

        alert('All ClassPlanner data has been permanently deleted.');
      }

      getAllStudents() {
        const currentClass = this.getCurrentClass();
        if (!currentClass) return [];

        const layout = currentClass.layout;
        if (layout === 'circle') return currentClass.circle || [];
        if (layout === 'lines') {
          let all = [];
          if (currentClass.lines) currentClass.lines.forEach(l => { if (Array.isArray(l)) all.push(...l); });
          return all;
        }
        if (['half', 'third', 'fourth', 'fifth', 'sixth'].includes(layout)) {
          const gArr = currentClass.layoutsData ? currentClass.layoutsData[layout] : [];
          return (gArr || []).flat();
        }

        if (currentClass.divideRows && Array.isArray(currentClass.dividedRowsData)) {
          let all = [];
          currentClass.dividedRowsData.forEach(rSecs => {
            if (Array.isArray(rSecs)) {
              rSecs.forEach(sec => {
                if (Array.isArray(sec)) all.push(...sec);
              });
            }
          });
          return all;
        }

        let all = [];
        if (currentClass.rows) currentClass.rows.forEach(r => all.push(...r));
        return all;
      }

      toggleEditMode(targetState) {
        if (typeof targetState === 'boolean') {
          this.isEditMode = targetState;
        } else {
          this.isEditMode = !this.isEditMode;
        }

        const headerBtn = document.getElementById('headerEditBtn');
        const rosterBtn = document.getElementById('rosterEditBtn');
        const fsBtn = document.getElementById('fullscreenEditBtn');

        const editBtns = [headerBtn, rosterBtn, fsBtn].filter(Boolean);

        if (this.isEditMode) {
          document.body.classList.add('edit-mode');
          editBtns.forEach(btn => {
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-primary');
          });
        } else {
          document.body.classList.remove('edit-mode');
          editBtns.forEach(btn => {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
          });
        }
        this.render();
        if (this.currentViewMode === 'attendance') {
          this.renderAttendanceTable();
        } else if (this.currentViewMode === 'grades') {
          this.renderGradesTable();
        }
      }

      toggleStudentAbsent(studentName) {
        if (!studentName) return;
        const currentClass = this.getCurrentClass();
        if (!currentClass) return;

        if (!Array.isArray(currentClass.absentStudents)) {
          currentClass.absentStudents = [];
        }

        const idx = currentClass.absentStudents.indexOf(studentName);
        if (idx > -1) {
          currentClass.absentStudents.splice(idx, 1);
        } else {
          currentClass.absentStudents.push(studentName);
        }

        this.saveData();
        this.render();
      }

      isStudentAbsent(currentClass, studentName) {
        if (!currentClass || !Array.isArray(currentClass.absentStudents) || !studentName) return false;
        return currentClass.absentStudents.includes(studentName);
      }

      selectAttendanceToday() {
        this.activeTakeAttendanceMode = 'today';
        this.selectedAttendanceDate = new Date();

        const btnToday = document.getElementById('btnAttendanceToday');
        const btnChoose = document.getElementById('btnAttendanceChoose');

        if (btnToday) {
          btnToday.classList.add('btn-green');
          btnToday.classList.remove('btn-secondary');
        }
        if (btnChoose) {
          btnChoose.classList.remove('btn-green');
          btnChoose.classList.add('btn-secondary');
        }
      }

      openAttendanceDateModal() {
        const modal = document.getElementById('attendanceDateModal');
        if (!modal) return;

        const dateToUse = this.selectedAttendanceDate || new Date();
        this.calendarViewMonth = dateToUse.getMonth();
        this.calendarViewYear = dateToUse.getFullYear();

        const dateInput = document.getElementById('attendanceDateInput');
        if (dateInput) {
          const yyyy = dateToUse.getFullYear();
          const mm = String(dateToUse.getMonth() + 1).padStart(2, '0');
          const dd = String(dateToUse.getDate()).padStart(2, '0');
          dateInput.value = `${yyyy}-${mm}-${dd}`;
        }

        this.renderCalendarGrid();
        modal.classList.add('active');
      }

      changeCalendarMonth(delta) {
        this.calendarViewMonth += delta;
        if (this.calendarViewMonth > 11) {
          this.calendarViewMonth = 0;
          this.calendarViewYear += 1;
        } else if (this.calendarViewMonth < 0) {
          this.calendarViewMonth = 11;
          this.calendarViewYear -= 1;
        }
        this.renderCalendarGrid();
      }

      renderCalendarGrid() {
        const grid = document.getElementById('calendarDaysGrid');
        const monthYearSpan = document.getElementById('calendarMonthYear');
        if (!grid) return;

        grid.innerHTML = '';

        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        if (monthYearSpan) {
          monthYearSpan.textContent = `${monthNames[this.calendarViewMonth]} ${this.calendarViewYear}`;
        }

        const firstDayIndex = new Date(this.calendarViewYear, this.calendarViewMonth, 1).getDay();
        const totalDays = new Date(this.calendarViewYear, this.calendarViewMonth + 1, 0).getDate();

        const today = new Date();
        const isCurrentMonthYearToday = (today.getFullYear() === this.calendarViewYear && today.getMonth() === this.calendarViewMonth);

        const selDate = this.selectedAttendanceDate || new Date();
        const isSelMonthYear = (selDate.getFullYear() === this.calendarViewYear && selDate.getMonth() === this.calendarViewMonth);

        // Empty cells before 1st of month
        for (let i = 0; i < firstDayIndex; i++) {
          const emptyDiv = document.createElement('div');
          emptyDiv.className = 'calendar-day-btn empty-cell';
          grid.appendChild(emptyDiv);
        }

        // Day cells
        for (let day = 1; day <= totalDays; day++) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'calendar-day-btn';
          btn.textContent = day;

          if (isCurrentMonthYearToday && day === today.getDate()) {
            btn.classList.add('today-cell');
          }

          if (isSelMonthYear && day === selDate.getDate()) {
            btn.classList.add('selected');
          }

          btn.onclick = () => {
            this.selectedAttendanceDate = new Date(this.calendarViewYear, this.calendarViewMonth, day);
            const dateInput = document.getElementById('attendanceDateInput');
            if (dateInput) {
              const yyyy = this.calendarViewYear;
              const mm = String(this.calendarViewMonth + 1).padStart(2, '0');
              const dd = String(day).padStart(2, '0');
              dateInput.value = `${yyyy}-${mm}-${dd}`;
            }
            this.renderCalendarGrid();
          };

          grid.appendChild(btn);
        }
      }

      onDateInputChange(valStr) {
        if (!valStr) return;
        const parts = valStr.split('-');
        if (parts.length === 3) {
          const yyyy = parseInt(parts[0], 10);
          const mm = parseInt(parts[1], 10) - 1;
          const dd = parseInt(parts[2], 10);
          this.selectedAttendanceDate = new Date(yyyy, mm, dd);
          this.calendarViewYear = yyyy;
          this.calendarViewMonth = mm;
          this.renderCalendarGrid();
        }
      }

      confirmAttendanceDate() {
        this.activeTakeAttendanceMode = 'choose';

        const btnChoose = document.getElementById('btnAttendanceChoose');
        const icon = document.getElementById('attendanceStatusIcon');

        if (btnChoose) {
          btnChoose.classList.add('btn-green');
          btnChoose.classList.remove('btn-secondary');
        }

        if (icon) {
          icon.classList.remove('unconfirmed');
          icon.classList.add('confirmed');
          const dash = icon.querySelector('.icon-dash');
          const check = icon.querySelector('.icon-check');
          if (dash) dash.style.display = 'none';
          if (check) check.style.display = 'inline-block';
        }

        const currentClass = this.getCurrentClass();
        if (currentClass) {
          this.recordAttendanceForDate(currentClass, this.selectedAttendanceDate || new Date());
        }

        this.closeModal('attendanceDateModal');
      }

      recordAttendanceForDate(currentClass, dateObj) {
        if (!currentClass) return;

        if (!Array.isArray(currentClass.attendanceDates)) {
          currentClass.attendanceDates = this.getDefaultAttendanceDates();
        }

        const yyyy = dateObj.getFullYear();
        const mm = dateObj.getMonth();
        const dd = dateObj.getDate();
        const timestamp = new Date(yyyy, mm, dd).getTime();

        const dateStr = `${mm + 1}/${dd}/${String(yyyy).slice(-2)}`;
        const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const dayStr = daysOfWeek[dateObj.getDay()];

        const absentSet = new Set(Array.isArray(currentClass.absentStudents) ? currentClass.absentStudents : []);
        const unplacedSet = new Set(Array.isArray(currentClass.unplacedStudents) ? currentClass.unplacedStudents : []);

        const statuses = {};
        (currentClass.classList || []).forEach(student => {
          if (absentSet.has(student)) {
            statuses[student] = 'absent';
          } else if (unplacedSet.has(student)) {
            statuses[student] = 'unplaced';
          } else {
            statuses[student] = 'present';
          }
        });

        const dateId = 'date_' + timestamp;
        const existingIdx = currentClass.attendanceDates.findIndex(d => d.timestamp === timestamp || d.date === dateStr);
        if (existingIdx > -1) {
          currentClass.attendanceDates[existingIdx].statuses = statuses;
        } else {
          currentClass.attendanceDates.push({
            id: dateId,
            date: dateStr,
            day: dayStr,
            timestamp: timestamp,
            statuses: statuses
          });
        }

        // Sort chronologically by timestamp
        currentClass.attendanceDates.sort((a, b) => a.timestamp - b.timestamp);

        this.saveData();
        if (this.isAttendanceView) {
          this.renderAttendanceTable();
        }
      }

      getDefaultAttendanceDates() {
        return [
          { id: 'd1', date: '7/7/26', day: 'Tuesday', timestamp: new Date(2026, 6, 7).getTime() },
          { id: 'd2', date: '7/9/26', day: 'Thursday', timestamp: new Date(2026, 6, 9).getTime() },
          { id: 'd3', date: '7/11/26', day: 'Saturday', timestamp: new Date(2026, 6, 11).getTime() },
          { id: 'd4', date: '7/14/26', day: 'Tuesday', timestamp: new Date(2026, 6, 14).getTime() },
          { id: 'd5', date: '7/16/26', day: 'Thursday', timestamp: new Date(2026, 6, 16).getTime() },
          { id: 'd6', date: '7/18/26', day: 'Saturday', timestamp: new Date(2026, 6, 18).getTime() },
          { id: 'd7', date: '7/21/26', day: 'Tuesday', timestamp: new Date(2026, 6, 21).getTime() },
          { id: 'd8', date: '7/23/26', day: 'Thursday', timestamp: new Date(2026, 6, 23).getTime() },
          { id: 'd9', date: '7/25/26', day: 'Saturday', timestamp: new Date(2026, 6, 25).getTime() },
          { id: 'd10', date: '7/28/26', day: 'Tuesday', timestamp: new Date(2026, 6, 28).getTime() }
        ];
      }

      getDefaultGradeColumns() {
        return [
          { id: 'g1', title: 'Singing', date: '8/11/26', day: 'Tuesday', timestamp: new Date(2026, 7, 11).getTime(), grades: { 'Alex Morgan': 'plus', 'Jordan Lee': 'plus', 'Taylor Smith': 'minus' } },
          { id: 'g2', title: 'Singing', date: '8/13/26', day: 'Thursday', timestamp: new Date(2026, 7, 13).getTime(), grades: { 'Alex Morgan': 'plus', 'Jordan Lee': 'minus', 'Taylor Smith': 'x' } },
          { id: 'g3', title: 'Instruments', date: '8/15/26', day: 'Saturday', timestamp: new Date(2026, 7, 15).getTime(), grades: { 'Alex Morgan': 'plus', 'Jordan Lee': 'plus', 'Taylor Smith': 'plus' } }
        ];
      }

      switchViewMode(mode) {
        this.currentViewMode = mode || 'chart';
        this.isAttendanceView = (this.currentViewMode === 'attendance');
        this.updateViewMode();
      }

      toggleAttendanceView() {
        this.switchViewMode(this.currentViewMode === 'attendance' ? 'chart' : 'attendance');
      }

      toggleGradesView() {
        this.switchViewMode(this.currentViewMode === 'grades' ? 'chart' : 'grades');
      }

      updateViewMode() {
        const seatingBody = document.getElementById('seatingAppBody');
        const attendanceBody = document.getElementById('attendanceAppBody');
        const gradesBody = document.getElementById('gradesAppBody');
        const aboutBody = document.getElementById('aboutAppBody');

        const navSeating = document.getElementById('navBtnSeating');
        const navAttendance = document.getElementById('navBtnAttendance');
        const navGrades = document.getElementById('navBtnGrades');

        const layoutBtn = document.getElementById('headerLayoutBtn');
        const resizeBtn = document.getElementById('btnResize');
        const chartCamBtn = document.getElementById('chartCameraBtn');
        const attendanceCamBtn = document.getElementById('attendanceCameraBtn');
        const gradesCamBtn = document.getElementById('gradesCameraBtn');
        const layoutBar = document.getElementById('layoutBar');

        if (layoutBar && (this.currentViewMode === 'attendance' || this.currentViewMode === 'grades' || this.currentViewMode === 'about')) {
          layoutBar.classList.remove('open');
        }

        [navSeating, navAttendance, navGrades].forEach(btn => {
          if (btn) {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
          }
        });

        if (this.currentViewMode === 'attendance') {
          if (seatingBody) seatingBody.style.display = 'none';
          if (gradesBody) gradesBody.style.display = 'none';
          if (aboutBody) aboutBody.style.display = 'none';
          if (attendanceBody) attendanceBody.style.display = 'flex';

          if (navAttendance) {
            navAttendance.classList.remove('btn-secondary');
            navAttendance.classList.add('btn-primary');
          }

          if (layoutBtn) layoutBtn.style.display = 'none';
          if (resizeBtn) resizeBtn.style.display = 'none';
          if (chartCamBtn) chartCamBtn.style.display = 'none';
          if (attendanceCamBtn) attendanceCamBtn.style.display = 'inline-flex';
          if (gradesCamBtn) gradesCamBtn.style.display = 'none';

          this.renderAttendanceTable();
        } else if (this.currentViewMode === 'grades') {
          if (seatingBody) seatingBody.style.display = 'none';
          if (attendanceBody) attendanceBody.style.display = 'none';
          if (aboutBody) aboutBody.style.display = 'none';
          if (gradesBody) gradesBody.style.display = 'flex';

          if (navGrades) {
            navGrades.classList.remove('btn-secondary');
            navGrades.classList.add('btn-primary');
          }

          if (layoutBtn) layoutBtn.style.display = 'none';
          if (resizeBtn) resizeBtn.style.display = 'none';
          if (chartCamBtn) chartCamBtn.style.display = 'none';
          if (attendanceCamBtn) attendanceCamBtn.style.display = 'none';
          if (gradesCamBtn) gradesCamBtn.style.display = 'inline-flex';

          this.renderGradesTable();
        } else if (this.currentViewMode === 'about') {
          if (seatingBody) seatingBody.style.display = 'none';
          if (attendanceBody) attendanceBody.style.display = 'none';
          if (gradesBody) gradesBody.style.display = 'none';
          if (aboutBody) aboutBody.style.display = 'flex';

          if (layoutBtn) layoutBtn.style.display = 'none';
          if (resizeBtn) resizeBtn.style.display = 'none';
          if (chartCamBtn) chartCamBtn.style.display = 'none';
          if (attendanceCamBtn) attendanceCamBtn.style.display = 'none';
          if (gradesCamBtn) gradesCamBtn.style.display = 'none';
        } else {
          if (attendanceBody) attendanceBody.style.display = 'none';
          if (gradesBody) gradesBody.style.display = 'none';
          if (aboutBody) aboutBody.style.display = 'none';
          if (seatingBody) seatingBody.style.display = 'flex';

          if (navSeating) {
            navSeating.classList.remove('btn-secondary');
            navSeating.classList.add('btn-primary');
          }

          if (layoutBtn) layoutBtn.style.display = '';
          if (resizeBtn) resizeBtn.style.display = '';
          if (chartCamBtn) chartCamBtn.style.display = 'inline-flex';
          if (attendanceCamBtn) attendanceCamBtn.style.display = 'none';
          if (gradesCamBtn) gradesCamBtn.style.display = 'none';
        }

        this.updateSubheaders();
      }

      openAboutPage() {
        this.closeModal('settingsModal');
        this.switchViewMode('about');
      }

      triggerChartCameraClick(btnEl) {
        this.triggerCameraClick(btnEl);
      }

      getCategoryTheme(title) {
        const cat = (title || '').trim().toLowerCase();
        if (cat.includes('singing')) {
          return {
            key: 'singing',
            bgCell: '#fff7ed',
            bgHeader: '#ffedd5',
            color: '#c2410c',
            border: '#fdba74'
          };
        } else if (cat.includes('instrument')) {
          return {
            key: 'instruments',
            bgCell: '#fefce8',
            bgHeader: '#fef9c3',
            color: '#a16207',
            border: '#fde047'
          };
        } else if (cat.includes('movement')) {
          return {
            key: 'movement',
            bgCell: '#f0fdf4',
            bgHeader: '#dcfce7',
            color: '#15803d',
            border: '#86efac'
          };
        } else if (cat.includes('culture')) {
          return {
            key: 'culture',
            bgCell: '#eff6ff',
            bgHeader: '#dbeafe',
            color: '#1e40af',
            border: '#93c5fd'
          };
        } else if (cat.includes('theory')) {
          return {
            key: 'theory',
            bgCell: '#fdf2f8',
            bgHeader: '#fce7f3',
            color: '#be185d',
            border: '#fbcfe8'
          };
        } else if (cat.includes('effort')) {
          return {
            key: 'effort',
            bgCell: '#fef2f2',
            bgHeader: '#fee2e2',
            color: '#b91c1c',
            border: '#fca5a5'
          };
        }
        return {
          key: 'default',
          bgCell: '#ffffff',
          bgHeader: '#e0e7ff',
          color: '#4f46e5',
          border: '#c7d2fe'
        };
      }

      formatDisplayDate(str) {
        if (!str) return 'Date';
        const s = String(str).trim();
        const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (isoMatch) {
          const y = parseInt(isoMatch[1], 10) % 100;
          const m = parseInt(isoMatch[2], 10);
          const d = parseInt(isoMatch[3], 10);
          return `${m}/${d}/${y < 10 ? '0' + y : y}`;
        }
        return s;
      }

      openAddGradeColumnModal() {
        if (this.isDraftScoringActive && this.draftGradeColumn) {
          // Complete the active draft assessment column!
          const currentClass = this.getCurrentClass();
          if (currentClass) {
            if (!Array.isArray(currentClass.gradeColumns)) {
              currentClass.gradeColumns = this.getDefaultGradeColumns();
            }

            currentClass.gradeColumns.push({ ...this.draftGradeColumn });
            this.saveData();
          }

          this.draftGradeColumn = null;
          this.isDraftScoringActive = false;

          const addBtn = document.getElementById('btnAddGradeColumn');
          if (addBtn) {
            addBtn.textContent = '+ Add Assessment';
            addBtn.classList.remove('btn-orange');
            addBtn.classList.add('btn-primary');
            addBtn.style.background = '';
            addBtn.style.borderColor = '';
            addBtn.style.color = '';
          }

          this.renderGradesTable();
          return;
        }

        const titleSelect = document.getElementById('gradeTitleSelect');
        const dateInput = document.getElementById('gradeDateInput');
        if (titleSelect) titleSelect.selectedIndex = 0;
        if (dateInput) {
          const today = new Date();
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth() + 1).padStart(2, '0');
          const dd = String(today.getDate()).padStart(2, '0');
          dateInput.value = `${yyyy}-${mm}-${dd}`;
        }
        const modal = document.getElementById('addGradeColumnModal');
        if (modal) modal.classList.add('active');
      }

      closeAddGradeColumnModal() {
        const modal = document.getElementById('addGradeColumnModal');
        if (modal) modal.classList.remove('active');
      }

      saveAddGradeColumn() {
        const currentClass = this.getCurrentClass();
        if (!currentClass) return;

        const titleSelect = document.getElementById('gradeTitleSelect');
        const dateInput = document.getElementById('gradeDateInput');

        const title = (titleSelect && titleSelect.value) ? titleSelect.value : 'Singing';
        const rawDate = (dateInput && dateInput.value) ? dateInput.value.trim() : '';
        const date = this.formatDisplayDate(rawDate);

        this.draftGradeColumn = {
          id: 'g_' + Date.now(),
          title: title,
          date: date,
          timestamp: Date.now(),
          grades: {}
        };
        this.isDraftScoringActive = true;

        this.closeAddGradeColumnModal();

        const addBtn = document.getElementById('btnAddGradeColumn');
        if (addBtn) {
          addBtn.textContent = 'Complete';
          addBtn.classList.remove('btn-primary');
          addBtn.style.background = '#f97316';
          addBtn.style.borderColor = '#ea580c';
          addBtn.style.color = '#ffffff';
        }

        this.renderGradesTable();
      }

      recordDraftGradeScore(studentName, action) {
        if (!this.isDraftScoringActive || !this.draftGradeColumn) return;
        if (!studentName) return;

        if (!this.draftGradeColumn.grades) {
          this.draftGradeColumn.grades = {};
        }

        const currentScore = this.draftGradeColumn.grades[studentName] || '';
        let nextScore = '';

        if (action === 'plus') {
          if (currentScore === 'check' || currentScore === 'plus') {
            nextScore = '';
          } else {
            nextScore = 'plus';
          }
        } else if (action === 'minus') {
          if (currentScore === 'minus') {
            nextScore = 'x'; // pressed twice -> turns to red X!
          } else if (currentScore === 'x') {
            nextScore = '';
          } else {
            nextScore = 'minus';
          }
        }

        this.draftGradeColumn.grades[studentName] = nextScore;
        this.renderGradesTable();
      }

      onGradeSessionButtonClick() {
        if (!this.isGradeScoringActive) {
          const titleSelect = document.getElementById('gradeSessionTitleSelect');
          const dateInput = document.getElementById('gradeSessionDateInput');
          if (titleSelect) titleSelect.selectedIndex = 0;
          if (dateInput) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            dateInput.value = `${yyyy}-${mm}-${dd}`;
          }
          const modal = document.getElementById('startGradeSessionModal');
          if (modal) modal.classList.add('active');
        } else {
          // Complete active live grade session!
          const currentClass = this.getCurrentClass();
          if (currentClass && this.activeGradeSession) {
            if (!Array.isArray(currentClass.gradeColumns)) {
              currentClass.gradeColumns = this.getDefaultGradeColumns();
            }

            const title = this.activeGradeSession.title || 'Singing';
            const date = this.activeGradeSession.date || 'Date';
            const scores = this.activeGradeSession.scores || {};

            const newId = 'g_' + Date.now();
            currentClass.gradeColumns.push({
              id: newId,
              title: title,
              date: date,
              timestamp: Date.now(),
              grades: { ...scores }
            });

            this.saveData();
          }

          this.isGradeScoringActive = false;
          this.activeGradeSession = { title: 'Singing', date: '', scores: {} };

          const startBtn = document.getElementById('btnGradeSessionStart');
          const statusIcon = document.getElementById('gradeStatusIcon');

          if (startBtn) {
            startBtn.textContent = 'Start';
            startBtn.classList.remove('btn-primary');
            startBtn.classList.add('btn-secondary');
            startBtn.style.background = '';
            startBtn.style.borderColor = '';
            startBtn.style.color = '';
          }

          // Green check mark confirmation flash animation
          if (statusIcon) {
            statusIcon.classList.remove('unconfirmed');
            statusIcon.classList.add('confirmed');
            const iconPlus = statusIcon.querySelector('.icon-plus');
            const iconCheck = statusIcon.querySelector('.icon-check');
            if (iconPlus) iconPlus.style.display = 'none';
            if (iconCheck) iconCheck.style.display = 'inline';

            statusIcon.style.transform = 'scale(1.3)';
            statusIcon.style.transition = 'transform 0.2s ease-out';
            setTimeout(() => {
              statusIcon.style.transform = 'scale(1)';
            }, 250);

            setTimeout(() => {
              statusIcon.classList.remove('confirmed');
              statusIcon.classList.add('unconfirmed');
              if (iconPlus) iconPlus.style.display = 'inline';
              if (iconCheck) iconCheck.style.display = 'none';
            }, 3000);
          }

          this.render();
          if (this.currentViewMode === 'grades') {
            this.renderGradesTable();
          }
        }
      }

      confirmStartGradeSession() {
        const titleSelect = document.getElementById('gradeSessionTitleSelect');
        const dateInput = document.getElementById('gradeSessionDateInput');

        const title = (titleSelect && titleSelect.value) ? titleSelect.value : 'Singing';
        const rawDate = (dateInput && dateInput.value) ? dateInput.value.trim() : '';
        const date = this.formatDisplayDate(rawDate);

        this.activeGradeSession = {
          title: title,
          date: date,
          scores: {}
        };
        this.isGradeScoringActive = true;

        this.closeModal('startGradeSessionModal');

        const startBtn = document.getElementById('btnGradeSessionStart');

        if (startBtn) {
          startBtn.textContent = 'Complete';
          startBtn.classList.remove('btn-secondary');
          startBtn.style.background = '#f97316';
          startBtn.style.borderColor = '#ea580c';
          startBtn.style.color = '#ffffff';
        }

        this.render();
      }

      recordLiveGradeScore(studentName, action) {
        if (!this.isGradeScoringActive || !this.activeGradeSession) return;
        if (!studentName) return;

        if (!this.activeGradeSession.scores) {
          this.activeGradeSession.scores = {};
        }

        const currentScore = this.activeGradeSession.scores[studentName] || '';
        let nextScore = '';

        if (action === 'plus') {
          if (currentScore === 'check') {
            nextScore = '';
          } else {
            nextScore = 'check';
          }
        } else if (action === 'minus') {
          if (currentScore === 'minus') {
            nextScore = 'x'; // pressed twice -> turns to red X!
          } else if (currentScore === 'x') {
            nextScore = '';
          } else {
            nextScore = 'minus';
          }
        }

        this.activeGradeSession.scores[studentName] = nextScore;
        this.render();
      }

      deleteGradeColumn(gradeId) {
        const currentClass = this.getCurrentClass();
        if (!currentClass || !Array.isArray(currentClass.gradeColumns)) return;

        currentClass.gradeColumns = currentClass.gradeColumns.filter(g => g.id !== gradeId);
        this.saveData();
        this.renderGradesTable();
      }

      moveGradeColumn(gradeId, direction) {
        if (!this.isEditMode) return;
        const currentClass = this.getCurrentClass();
        if (!currentClass || !Array.isArray(currentClass.gradeColumns)) return;

        const cols = currentClass.gradeColumns;
        const index = cols.findIndex(g => g.id === gradeId);
        if (index === -1) return;

        const targetIndex = direction === 'left' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= cols.length) return;

        const temp = cols[index];
        cols[index] = cols[targetIndex];
        cols[targetIndex] = temp;

        this.saveData();
        this.renderGradesTable();
      }

      handleGradeColDragStart(e, index) {
        if (!this.isEditMode) return;
        this.draggedGradeColIndex = index;
        if (e && e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(index));
        }
        const th = (e && e.target && typeof e.target.closest === 'function') ? e.target.closest('th') : null;
        if (th) th.classList.add('column-dragging');
      }

      handleGradeColDragOver(e) {
        if (!this.isEditMode || this.draggedGradeColIndex === null) return;
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      }

      handleGradeColDragEnter(e) {
        if (!this.isEditMode || this.draggedGradeColIndex === null) return;
        const th = (e && e.target && typeof e.target.closest === 'function') ? e.target.closest('th') : null;
        if (th) th.classList.add('column-drag-over');
      }

      handleGradeColDragLeave(e) {
        const th = (e && e.target && typeof e.target.closest === 'function') ? e.target.closest('th') : null;
        if (th) th.classList.remove('column-drag-over');
      }

      handleGradeColDrop(e, targetIndex) {
        if (!this.isEditMode || this.draggedGradeColIndex === null) return;
        e.preventDefault();

        const fromIndex = this.draggedGradeColIndex;
        this.draggedGradeColIndex = null;

        const ths = document.querySelectorAll('th.grade-col-header');
        ths.forEach(t => t.classList.remove('column-dragging', 'column-drag-over'));

        if (fromIndex === targetIndex || fromIndex === null || targetIndex === undefined) return;

        const currentClass = this.getCurrentClass();
        if (!currentClass || !Array.isArray(currentClass.gradeColumns)) return;

        const cols = currentClass.gradeColumns;
        if (fromIndex < 0 || fromIndex >= cols.length || targetIndex < 0 || targetIndex >= cols.length) return;

        const [movedCol] = cols.splice(fromIndex, 1);
        cols.splice(targetIndex, 0, movedCol);

        this.saveData();
        this.renderGradesTable();
      }

      cycleStudentGrade(currentClass, gradeId, studentName) {
        if (!this.isEditMode) return;
        if (!currentClass || !gradeId || !studentName) return;
        if (!Array.isArray(currentClass.gradeColumns)) {
          currentClass.gradeColumns = this.getDefaultGradeColumns();
        }

        const col = currentClass.gradeColumns.find(g => g.id === gradeId);
        if (!col) return;

        if (!col.grades) col.grades = {};
        const currentGrade = col.grades[studentName] !== undefined ? col.grades[studentName] : null;

        let nextGrade = 'check';
        if (currentGrade === 'check') nextGrade = 'minus';
        else if (currentGrade === 'minus') nextGrade = 'x';
        else if (currentGrade === 'x') nextGrade = '';
        else nextGrade = 'check';

        col.grades[studentName] = nextGrade;
        this.saveData();
        this.renderGradesTable();
      }

      getStudentAttendanceRatio(currentClass, student) {
        if (!currentClass) return '(0/0)';
        if (!Array.isArray(currentClass.attendanceDates)) {
          currentClass.attendanceDates = this.getDefaultAttendanceDates();
        }
        const dates = currentClass.attendanceDates || [];
        if (dates.length === 0) return '(0/0)';

        let presentCount = 0;
        dates.forEach(d => {
          let status = (d.statuses && d.statuses[student] !== undefined) ? d.statuses[student] : null;

          if (status === null) {
            const seedStr = `${currentClass.id}_${student}_${d.date}`;
            let hash = 0;
            for (let i = 0; i < seedStr.length; i++) {
              hash = ((hash << 5) - hash) + seedStr.charCodeAt(i);
              hash |= 0;
            }
            status = ((Math.abs(hash) % 10) >= 3) ? 'present' : 'absent';
          }

          if (status === 'present') {
            presentCount++;
          }
        });

        return `(${presentCount}/${dates.length})`;
      }

      renderGradesTable() {
        const table = document.getElementById('gradesTable');
        if (!table) return;

        const currentClass = this.getCurrentClass();
        if (!currentClass) {
          table.innerHTML = '<tr><td style="padding: 20px; color: var(--text-muted);">No class selected</td></tr>';
          return;
        }

        if (!Array.isArray(currentClass.gradeColumns)) {
          currentClass.gradeColumns = this.getDefaultGradeColumns();
        }

        const classList = currentClass.classList || [];
        const gradeCols = currentClass.gradeColumns;
        const isEdit = this.isEditMode;

        const displayGradeCols = [...gradeCols];
        if (this.isDraftScoringActive && this.draftGradeColumn) {
          displayGradeCols.push({ ...this.draftGradeColumn, isDraft: true });
        }

        let html = '<thead><tr><th style="min-width: 220px; text-align: left; background-color: #f1f5f9;">Student Name</th>';
        displayGradeCols.forEach((col, idx) => {
          if (col.isDraft) {
            html += `<th style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; border-left: 2px dashed #94a3b8; border-right: 2px dashed #94a3b8;">
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.25; padding: 4px 2px;">
                <span style="font-weight: 800; font-size: 0.85rem; color: #475569; background: #e2e8f0; padding: 2px 8px; border-radius: 12px; border: 1px solid #cbd5e1; font-family: inherit;">${this.escapeHtml(col.title || 'Grade')}</span>
                <span style="font-weight: 700; font-size: 0.8rem; color: #64748b; margin-top: 3px;">${col.date}</span>
                <span style="font-weight: 800; font-size: 0.68rem; text-transform: uppercase; color: #f97316; margin-top: 2px; letter-spacing: 0.5px;">(Drafting)</span>
              </div>
            </th>`;
          } else {
            const theme = this.getCategoryTheme(col.title);
            const isFirst = (idx === 0);
            const isLast = (idx === gradeCols.length - 1);

            const editControlsHTML = isEdit
              ? `<div style="display: flex; gap: 4px; align-items: center; justify-content: center; margin-bottom: 3px;">
                  <button class="col-move-btn" onclick="event.stopPropagation(); app.moveGradeColumn('${col.id}', 'left')" title="Move Left" ${isFirst ? 'disabled' : ''}>◀</button>
                  <button class="delete-date-col-btn" onclick="event.stopPropagation(); app.deleteGradeColumn('${col.id}')" title="Delete Column">&times;</button>
                  <button class="col-move-btn" onclick="event.stopPropagation(); app.moveGradeColumn('${col.id}', 'right')" title="Move Right" ${isLast ? 'disabled' : ''}>▶</button>
                </div>`
              : '';

            const dragAttrs = isEdit
              ? `draggable="true" ondragstart="app.handleGradeColDragStart(event, ${idx})" ondragover="app.handleGradeColDragOver(event)" ondragenter="app.handleGradeColDragEnter(event)" ondragleave="app.handleGradeColDragLeave(event)" ondrop="app.handleGradeColDrop(event, ${idx})" class="grade-col-header"`
              : '';

            const colTitleAttr = isEdit ? 'title="Drag to reorder column or use ◀ ▶ buttons"' : '';

            html += `<th style="background-color: ${theme.bgCell}; border-bottom: 2px solid ${theme.border};" ${dragAttrs} ${colTitleAttr}>
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.25; padding: 4px 2px;">
                ${editControlsHTML}
                <span style="font-weight: 800; font-size: 0.85rem; color: ${theme.color}; background: ${theme.bgHeader}; padding: 2px 8px; border-radius: 12px; border: 1px solid ${theme.border}; font-family: inherit;">${this.escapeHtml(col.title || 'Grade')}</span>
                <span style="font-weight: 700; font-size: 0.8rem; color: #0f172a; margin-top: 3px;">${col.date}</span>
              </div>
            </th>`;
          }
        });
        html += '</tr></thead>';

        html += '<tbody>';
        if (classList.length === 0) {
          html += `<tr><td colspan="${displayGradeCols.length + 1}" style="text-align: center; color: var(--text-muted); font-style: italic; padding: 24px;">No students in this class list</td></tr>`;
        } else {
          classList.forEach(student => {
            const profile = this.getStudentProfile(currentClass, student);
            const fullName = (profile.lastName && profile.lastName.trim())
              ? `${profile.firstName} ${profile.lastName}`
              : (profile.firstName || student);

            const showGradesRatio = currentClass ? (currentClass.showGradesAttendanceRatio !== false) : true;
            const ratioText = showGradesRatio ? this.getStudentAttendanceRatio(currentClass, student) : '';
            const ratioHTML = showGradesRatio ? `<span style="font-size: 0.8rem; font-weight: 700; color: var(--primary); background: #e0e7ff; padding: 2px 6px; border-radius: 10px; margin-left: 8px;">${ratioText}</span>` : '';
            let gradeCellsHTML = '';

            displayGradeCols.forEach(col => {
              const gradeVal = (col.grades && col.grades[student] !== undefined) ? col.grades[student] : '';

              if (col.isDraft) {
                const isCheck = (gradeVal === 'check' || gradeVal === 'plus');
                const isMinus = (gradeVal === 'minus');
                const isX = (gradeVal === 'x');

                gradeCellsHTML += `<td style="background-color: #f8fafc; border: 1px solid #cbd5e1; text-align: center; padding: 6px 4px; border-left: 2px dashed #cbd5e1; border-right: 2px dashed #cbd5e1;">
                  <div class="grade-score-controls" style="justify-content: center;">
                    <button class="grade-score-btn grade-btn-plus ${isCheck ? 'active-check' : ''}" onclick="event.stopPropagation(); app.recordDraftGradeScore('${this.escapeQuotes(student)}', 'plus')" title="Exceeds / Pass (+)">${isCheck ? '+' : '+'}</button>
                    <button class="grade-score-btn grade-btn-minus ${isMinus ? 'active-minus' : (isX ? 'active-x' : '')}" onclick="event.stopPropagation(); app.recordDraftGradeScore('${this.escapeQuotes(student)}', 'minus')" title="Click for Minus (−), double-click for X (✕)">${isX ? '✕' : '−'}</button>
                  </div>
                </td>`;
              } else {
                const theme = this.getCategoryTheme(col.title);
                let symbolHTML = '';
                if (gradeVal === 'check' || gradeVal === 'plus') {
                  symbolHTML = `<span class="grade-status-plus" title="Exceeds / Pass (+)">+</span>`;
                } else if (gradeVal === 'minus') {
                  symbolHTML = `<span class="grade-status-minus" title="Needs Work / Minus (−)">−</span>`;
                } else if (gradeVal === 'x') {
                  symbolHTML = `<span class="grade-status-x" title="Incomplete / Unsatisfactory (✕)">✕</span>`;
                } else {
                  symbolHTML = ``;
                }

                const cellClass = isEdit ? 'grade-cell-interactive' : 'grade-cell-readonly';
                const cellOnClick = isEdit ? `onclick="app.cycleStudentGrade(app.getCurrentClass(), '${col.id}', '${app.escapeQuotes(student)}')"` : '';
                const cellTitle = isEdit ? 'Click to change grade (+, −, ✕, blank)' : '';

                gradeCellsHTML += `<td class="${cellClass}" style="background-color: ${theme.bgCell}; border: 1px solid ${theme.border}; cursor: ${isEdit ? 'pointer' : 'default'};" ${cellOnClick} title="${cellTitle}">
                  ${symbolHTML}
                </td>`;
              }
            });

            html += `<tr><td><div style="display: flex; justify-content: space-between; align-items: center;"><span style="font-weight: 600; color: #0f172a;">${this.escapeHtml(fullName)}</span>${ratioHTML}</div></td>${gradeCellsHTML}</tr>`;
          });
        }
        html += '</tbody>';

        table.innerHTML = html;

        // Bind column hover highlighting for spreadsheet crosshair effect
        if (!table.dataset.hoverBound) {
          table.dataset.hoverBound = 'true';
          table.addEventListener('mouseover', (e) => {
            const td = e.target.closest('td, th');
            if (!td || !td.parentElement) return;
            const colIndex = td.cellIndex;
            if (colIndex === 0) return;

            const rows = table.querySelectorAll('tr');
            rows.forEach(row => {
              const cell = row.children[colIndex];
              if (cell) cell.classList.add('column-hover');
            });
          });

          table.addEventListener('mouseout', (e) => {
            const td = e.target.closest('td, th');
            if (!td) return;
            const cells = table.querySelectorAll('.column-hover');
            cells.forEach(cell => cell.classList.remove('column-hover'));
          });
        }
      }

      switchClass(classId) {
        this.currentClassId = classId;
        this.saveData();
        this.renderClassDropdown();
        this.render();
        if (this.currentViewMode === 'attendance') {
          this.renderAttendanceTable();
        } else if (this.currentViewMode === 'grades') {
          this.renderGradesTable();
        }
      }

      openEditClassesModal() {
        this.tempClasses = JSON.parse(JSON.stringify(this.classes));
        document.getElementById('modalAddClassName').value = '';
        this.renderModalClassesList();
        document.getElementById('editClassesModal').classList.add('active');
      }

      renderModalClassesList() {
        const container = document.getElementById('modalClassesList');
        container.innerHTML = '';

        if (this.tempClasses.length === 0) {
          container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 8px; text-align: center;">No classes available. Add a class above.</div>';
          return;
        }

        this.tempClasses.forEach((c, idx) => {
          const item = document.createElement('div');
          item.style.display = 'flex';
          item.style.alignItems = 'center';
          item.style.gap = '8px';
          item.style.background = 'white';
          item.style.padding = '6px 10px';
          item.style.border = '1px solid var(--border-color)';
          item.style.borderRadius = '6px';

          item.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 2px;">
              <button class="btn btn-outline" style="padding: 1px 6px; font-size: 0.75rem;" onclick="app.moveModalClass(${idx}, -1)" ${idx === 0 ? 'disabled' : ''}>▲</button>
              <button class="btn btn-outline" style="padding: 1px 6px; font-size: 0.75rem;" onclick="app.moveModalClass(${idx}, 1)" ${idx === this.tempClasses.length - 1 ? 'disabled' : ''}>▼</button>
            </div>
            <input type="text" value="${this.escapeHtml(c.name)}" style="flex: 1;" oninput="app.tempClasses[${idx}].name = this.value">
            <button class="btn" style="background: var(--danger); color: white; padding: 4px 8px;" onclick="app.deleteModalClass(${idx})" title="Delete Class">&times;</button>
          `;
          container.appendChild(item);
        });
      }

      moveModalClass(index, delta) {
        const targetIndex = index + delta;
        if (targetIndex >= 0 && targetIndex < this.tempClasses.length) {
          const item = this.tempClasses.splice(index, 1)[0];
          this.tempClasses.splice(targetIndex, 0, item);
          this.renderModalClassesList();
        }
      }

      deleteModalClass(index) {
        if (confirm(`Are you sure you want to delete "${this.tempClasses[index].name}"?`)) {
          this.tempClasses.splice(index, 1);
          this.renderModalClassesList();
        }
      }

      addClassFromModal() {
        const nameInput = document.getElementById('modalAddClassName');
        const name = nameInput.value.trim();
        if (!name) {
          alert('Please enter a class name.');
          return;
        }

        const newClass = {
          id: 'class-' + Date.now(),
          name: name,
          layout: 'rows',
          rowsCount: 4,
          rowAlignment: 'center',
          showFaces: true,
          rows: Array.from({ length: 4 }, () => []),
          circle: [],
          layoutsData: {
            half: [[], []],
            third: [[], [], []],
            fourth: [[], [], [], []],
            fifth: [[], [], [], [], []]
          },
          containerHeights: {}
        };

        this.tempClasses.push(newClass);
        nameInput.value = '';
        this.renderModalClassesList();
      }

      saveEditedClasses() {
        if (this.tempClasses.length === 0) {
          alert('You must have at least one class.');
          return;
        }

        if (this.tempClasses.some(c => !c.name.trim())) {
          alert('Class names cannot be empty.');
          return;
        }

        this.classes = JSON.parse(JSON.stringify(this.tempClasses));
        if (!this.classes.some(c => c.id === this.currentClassId)) {
          this.currentClassId = this.classes[0].id;
        }

        this.saveData();
        this.renderClassDropdown();
        this.render();
        this.closeModal('editClassesModal');
      }

      setLayout(layoutType) {
        const currentClass = this.getCurrentClass();
        if (!currentClass) return;

        const all = this.getAllClassStudents(currentClass);

        if (!currentClass.layoutsData) currentClass.layoutsData = {};

        if (layoutType === 'circle' && (!currentClass.circle || currentClass.circle.length === 0)) {
          currentClass.circle = [...all];
        } else if (layoutType === 'lines') {
          const lineCount = currentClass.linesCount || 4;
          if (!currentClass.lines || !Array.isArray(currentClass.lines) || currentClass.lines.length !== lineCount || currentClass.lines.flat().length === 0) {
            currentClass.lines = this.autoBalanceGroups(all, lineCount);
          }
        } else if (['half', 'third', 'fourth', 'fifth', 'sixth'].includes(layoutType)) {
          const numGroups = layoutType === 'half' ? 2 : layoutType === 'third' ? 3 : layoutType === 'fourth' ? 4 : layoutType === 'fifth' ? 5 : 6;
          const gArr = currentClass.layoutsData[layoutType];
          if (!gArr || !Array.isArray(gArr) || gArr.length < numGroups || gArr.flat().length === 0) {
            currentClass.layoutsData[layoutType] = this.autoBalanceGroups(all, numGroups);
          }
        }

        currentClass.layout = layoutType;
        this.saveData();
        this.render();
      }

      addSingleStudent() {
        const input = document.getElementById('singleStudentInput');
        const name = input.value.trim();
        if (!name) return;

        const currentClass = this.getCurrentClass();
        if (currentClass) {
          if (!currentClass.classList) currentClass.classList = [];
          if (!currentClass.classList.includes(name)) {
            currentClass.classList.push(name);
          }

          if (!currentClass.rows) currentClass.rows = [[]];
          if (currentClass.rows.length === 0) currentClass.rows.push([]);
          currentClass.rows[0].push(name);

          if (!currentClass.circle) currentClass.circle = [];
          currentClass.circle.push(name);

          if (!Array.isArray(currentClass.lines) || currentClass.lines.length < 4) {
            currentClass.lines = Array.from({ length: 4 }, () => []);
          }
          currentClass.lines[0].push(name);

          if (!currentClass.layoutsData) currentClass.layoutsData = {};
          ['half', 'third', 'fourth', 'fifth', 'sixth'].forEach((key, idx) => {
            const count = idx + 2;
            if (!currentClass.layoutsData[key] || currentClass.layoutsData[key].length === 0) {
              currentClass.layoutsData[key] = Array.from({ length: count }, () => []);
            }
            currentClass.layoutsData[key][0].push(name);
          });

          this.saveData();
          this.render();
          input.value = '';
          input.focus();
        }
      }

      openBulkModal() {
        document.getElementById('bulkStudentsInput').value = '';
        document.getElementById('bulkModal').classList.add('active');
      }

      addBulkStudents() {
        const text = document.getElementById('bulkStudentsInput').value;
        if (!text.trim()) return;

        const names = text.split(/[\n,]+/)
                          .map(n => n.trim())
                          .filter(n => n.length > 0);

        const currentClass = this.getCurrentClass();
        if (currentClass && names.length > 0) {
          if (!currentClass.classList) currentClass.classList = [];
          names.forEach(n => {
            if (!currentClass.classList.includes(n)) {
              currentClass.classList.push(n);
            }
          });

          if (!currentClass.rows) currentClass.rows = [[]];
          if (currentClass.rows.length === 0) currentClass.rows.push([]);
          currentClass.rows[0].push(...names);

          if (!currentClass.circle) currentClass.circle = [];
          currentClass.circle.push(...names);

          if (!Array.isArray(currentClass.lines) || currentClass.lines.length < 4) {
            currentClass.lines = Array.from({ length: 4 }, () => []);
          }
          currentClass.lines[0].push(...names);

          if (!currentClass.layoutsData) currentClass.layoutsData = {};
          ['half', 'third', 'fourth', 'fifth', 'sixth'].forEach((key, idx) => {
            const count = idx + 2;
            if (!currentClass.layoutsData[key] || currentClass.layoutsData[key].length === 0) {
              currentClass.layoutsData[key] = Array.from({ length: count }, () => []);
            }
            currentClass.layoutsData[key][0].push(...names);
          });

          this.saveData();
          this.render();
          this.closeModal('bulkModal');
        }
      }

      removeStudent(nameToRemove) {
        const currentClass = this.getCurrentClass();
        if (!currentClass) return;

        currentClass.rows = currentClass.rows.map(row => Array.isArray(row) ? row.filter(name => name !== nameToRemove) : []);
        if (currentClass.circle && Array.isArray(currentClass.circle)) {
          currentClass.circle = currentClass.circle.filter(name => name !== nameToRemove);
        }
        if (currentClass.layoutsData) {
          ['half', 'third', 'fourth', 'fifth', 'sixth'].forEach(key => {
            if (Array.isArray(currentClass.layoutsData[key])) {
              currentClass.layoutsData[key] = currentClass.layoutsData[key].map(g => Array.isArray(g) ? g.filter(n => n !== nameToRemove) : []);
            }
          });
        }
        if (Array.isArray(currentClass.lines)) {
          currentClass.lines = currentClass.lines.map(line => Array.isArray(line) ? line.filter(name => name !== nameToRemove) : []);
        }
        if (Array.isArray(currentClass.dividedRowsData)) {
          currentClass.dividedRowsData.forEach(rSecs => {
            if (Array.isArray(rSecs)) {
              rSecs.forEach((sec, idx) => {
                if (Array.isArray(sec)) rSecs[idx] = sec.filter(n => n !== nameToRemove);
              });
            }
          });
        }

        if (!Array.isArray(currentClass.unplacedStudents)) {
          currentClass.unplacedStudents = [];
        }
        if (!currentClass.unplacedStudents.includes(nameToRemove)) {
          currentClass.unplacedStudents.push(nameToRemove);
        }

        this.saveData();
        this.render();
      }

      placeUnseatedStudent(nameToPlace) {
        const currentClass = this.getCurrentClass();
        if (!currentClass) return;

        if (Array.isArray(currentClass.unplacedStudents)) {
          currentClass.unplacedStudents = currentClass.unplacedStudents.filter(n => n !== nameToPlace);
        }

        const layout = currentClass.layout;
        if (layout === 'circle') {
          if (!currentClass.circle) currentClass.circle = [];
          if (!currentClass.circle.includes(nameToPlace)) currentClass.circle.push(nameToPlace);
        } else if (layout === 'lines') {
          const lineCount = currentClass.linesCount || 4;
          if (!Array.isArray(currentClass.lines) || currentClass.lines.length < lineCount) {
            currentClass.lines = Array.from({ length: lineCount }, () => []);
          }
          let minIdx = 0;
          let minLen = (currentClass.lines[0] || []).length;
          for (let i = 1; i < lineCount; i++) {
            const len = (currentClass.lines[i] || []).length;
            if (len < minLen) {
              minLen = len;
              minIdx = i;
            }
          }
          if (!currentClass.lines[minIdx]) currentClass.lines[minIdx] = [];
          currentClass.lines[minIdx].push(nameToPlace);
        } else if (['half', 'third', 'fourth', 'fifth', 'sixth'].includes(layout)) {
          if (!currentClass.layoutsData) currentClass.layoutsData = {};
          const count = layout === 'half' ? 2 : layout === 'third' ? 3 : layout === 'fourth' ? 4 : layout === 'fifth' ? 5 : 6;
          if (!Array.isArray(currentClass.layoutsData[layout]) || currentClass.layoutsData[layout].length < count) {
            currentClass.layoutsData[layout] = Array.from({ length: count }, () => []);
          }
          const gArr = currentClass.layoutsData[layout];
          let minIdx = 0;
          let minLen = gArr[0].length;
          for (let i = 1; i < gArr.length; i++) {
            if (gArr[i].length < minLen) {
              minLen = gArr[i].length;
              minIdx = i;
            }
          }
          if (!gArr[minIdx].includes(nameToPlace)) {
            gArr[minIdx].push(nameToPlace);
          }
        } else {
          // Rows layout
          if (currentClass.divideRows) {
            if (!Array.isArray(currentClass.dividedRowsData) || currentClass.dividedRowsData.length !== currentClass.rowsCount) {
              currentClass.dividedRowsData = [];
              for (let r = 0; r < currentClass.rowsCount; r++) {
                const rowStudents = currentClass.rows[r] || [];
                const halfIdx = Math.ceil(rowStudents.length / 2);
                currentClass.dividedRowsData.push([
                  rowStudents.slice(0, halfIdx),
                  rowStudents.slice(halfIdx)
                ]);
              }
            }

            let minR = 0, minSec = 0, minCount = Infinity;
            currentClass.dividedRowsData.forEach((rSecs, r) => {
              if (Array.isArray(rSecs)) {
                rSecs.forEach((sec, seci) => {
                  if (Array.isArray(sec) && sec.length < minCount) {
                    minCount = sec.length;
                    minR = r;
                    minSec = seci;
                  }
                });
              }
            });

            if (currentClass.dividedRowsData[minR] && currentClass.dividedRowsData[minR][minSec]) {
              currentClass.dividedRowsData[minR][minSec].push(nameToPlace);
            }

            for (let r = 0; r < currentClass.rowsCount; r++) {
              const rSecs = currentClass.dividedRowsData[r];
              if (rSecs) {
                currentClass.rows[r] = [...(rSecs[0] || []), ...(rSecs[1] || [])];
              }
            }
          } else {
            if (!currentClass.rows) currentClass.rows = [[]];
            if (currentClass.rows.length === 0) currentClass.rows.push([]);
            currentClass.rows[0].push(nameToPlace);
          }
        }

        this.saveData();
        this.render();
      }

      closeModal(id) {
        document.getElementById(id).classList.remove('active');
      }

      // Drag Handlers
      handleDragStart(e, studentName, groupIndex) {
        if (!this.isEditMode) return;
        this.draggedStudentName = studentName;
        this.sourceGroupIndex = groupIndex;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', studentName);

        setTimeout(() => {
          e.target.classList.add('dragging');
        }, 0);
      }

      handleDragOver(e) {
        if (!this.isEditMode) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }

      handleDragEnterGroup(e, targetIndex, elementIdPrefix) {
        if (!this.isEditMode) return;
        e.preventDefault();
        const el = document.getElementById(`${elementIdPrefix}-${targetIndex}`);
        if (el) el.classList.add('drag-over');
      }

      handleDragLeaveGroup(e, targetIndex, elementIdPrefix) {
        if (!this.isEditMode) return;
        const el = document.getElementById(`${elementIdPrefix}-${targetIndex}`);
        if (el && !el.contains(e.relatedTarget)) {
          el.classList.remove('drag-over');
        }
      }

      handleDropOnGroup(e, targetGroupIndex, layoutType) {
        if (!this.isEditMode) return;
        e.preventDefault();
        e.stopPropagation();

        const el = document.getElementById(`group-box-${targetGroupIndex}`);
        if (el) el.classList.remove('drag-over');

        if (!this.draggedStudentName) return;

        const currentClass = this.getCurrentClass();
        if (!currentClass || currentClass.layout !== layoutType) return;

        const groupArr = currentClass.layoutsData[layoutType];
        if (!groupArr) return;

        if (this.sourceGroupIndex !== null && groupArr[this.sourceGroupIndex]) {
          const sIdx = groupArr[this.sourceGroupIndex].indexOf(this.draggedStudentName);
          if (sIdx > -1) groupArr[this.sourceGroupIndex].splice(sIdx, 1);
        } else {
          groupArr.forEach(g => {
            const sIdx = g.indexOf(this.draggedStudentName);
            if (sIdx > -1) g.splice(sIdx, 1);
          });
        }

        if (!groupArr[targetGroupIndex]) groupArr[targetGroupIndex] = [];
        groupArr[targetGroupIndex].push(this.draggedStudentName);

        this.resetDragState();
        this.saveData();
        this.render();
      }

      handleDropOnRow(e, targetRowIndex, sectionIndex = 0) {
        if (!this.isEditMode) return;
        e.preventDefault();
        e.stopPropagation();

        const rowEl = document.getElementById(`seat-row-${targetRowIndex}`);
        if (rowEl) rowEl.classList.remove('drag-over');

        if (!this.draggedStudentName) return;

        const currentClass = this.getCurrentClass();
        if (!currentClass || currentClass.layout !== 'rows') return;

        if (Array.isArray(currentClass.unplacedStudents)) {
          currentClass.unplacedStudents = currentClass.unplacedStudents.filter(n => n !== this.draggedStudentName);
        }

        if (currentClass.divideRows) {
          if (!Array.isArray(currentClass.dividedRowsData) || currentClass.dividedRowsData.length !== currentClass.rowsCount) {
            currentClass.dividedRowsData = [];
            for (let r = 0; r < currentClass.rowsCount; r++) {
              const rowStudents = currentClass.rows[r] || [];
              const halfIdx = Math.ceil(rowStudents.length / 2);
              currentClass.dividedRowsData.push([
                rowStudents.slice(0, halfIdx),
                rowStudents.slice(halfIdx)
              ]);
            }
          }

          // Remove student from any existing divided row section
          currentClass.dividedRowsData.forEach(rSecs => {
            if (Array.isArray(rSecs)) {
              rSecs.forEach(sec => {
                if (Array.isArray(sec)) {
                  const idx = sec.indexOf(this.draggedStudentName);
                  if (idx > -1) sec.splice(idx, 1);
                }
              });
            }
          });

          // Add to target section
          const targetSec = currentClass.dividedRowsData[targetRowIndex][sectionIndex || 0];
          if (Array.isArray(targetSec) && !targetSec.includes(this.draggedStudentName)) {
            targetSec.push(this.draggedStudentName);
          }

          // Keep rows synchronized
          for (let r = 0; r < currentClass.rowsCount; r++) {
            const rSecs = currentClass.dividedRowsData[r];
            if (rSecs) {
              currentClass.rows[r] = [...(rSecs[0] || []), ...(rSecs[1] || [])];
            }
          }
        } else {
          const sourceRow = currentClass.rows[this.sourceGroupIndex];
          const sIndex = sourceRow ? sourceRow.indexOf(this.draggedStudentName) : -1;
          if (sIndex > -1) {
            sourceRow.splice(sIndex, 1);
          } else {
            currentClass.rows.forEach(r => {
              if (Array.isArray(r)) {
                const idx = r.indexOf(this.draggedStudentName);
                if (idx > -1) r.splice(idx, 1);
              }
            });
          }

          if (!currentClass.rows[targetRowIndex]) {
            currentClass.rows[targetRowIndex] = [];
          }
          currentClass.rows[targetRowIndex].push(this.draggedStudentName);
        }

        this.resetDragState();
        this.saveData();
        this.render();
      }

      handleDragEnterSeat(e) {
        if (!this.isEditMode) return;
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
      }

      handleDragLeaveSeat(e) {
        if (!this.isEditMode) return;
        if (!e.currentTarget.contains(e.relatedTarget)) {
          e.currentTarget.classList.remove('drag-over');
        }
      }

      handleDropOnSeat(e, targetStudentName, targetGroupIndex) {
        if (!this.isEditMode) return;
        e.preventDefault();
        e.stopPropagation();

        const seatEl = e.currentTarget;
        if (seatEl) seatEl.classList.remove('drag-over');

        if (!this.draggedStudentName || this.draggedStudentName === targetStudentName) return;

        const currentClass = this.getCurrentClass();
        if (!currentClass) return;

        const layout = currentClass.layout;

        const isDraggedUnplaced = Array.isArray(currentClass.unplacedStudents) && currentClass.unplacedStudents.includes(this.draggedStudentName);
        if (isDraggedUnplaced) {
          currentClass.unplacedStudents = currentClass.unplacedStudents.filter(n => n !== this.draggedStudentName);
        }

        if (layout === 'circle') {
          if (!currentClass.circle) currentClass.circle = [];
          const i1 = currentClass.circle.indexOf(this.draggedStudentName);
          const i2 = currentClass.circle.indexOf(targetStudentName);
          if (i1 > -1 && i2 > -1) {
            currentClass.circle[i1] = targetStudentName;
            currentClass.circle[i2] = this.draggedStudentName;
          } else if (i2 > -1) {
            currentClass.circle[i2] = this.draggedStudentName;
            if (!currentClass.unplacedStudents) currentClass.unplacedStudents = [];
            if (!currentClass.unplacedStudents.includes(targetStudentName)) {
              currentClass.unplacedStudents.push(targetStudentName);
            }
          }
        } else if (layout === 'lines') {
          if (Array.isArray(currentClass.lines)) {
            let l1 = -1, s1 = -1;
            let l2 = -1, s2 = -1;

            currentClass.lines.forEach((line, li) => {
              if (Array.isArray(line)) {
                const idx1 = line.indexOf(this.draggedStudentName);
                if (idx1 > -1) { l1 = li; s1 = idx1; }
                const idx2 = line.indexOf(targetStudentName);
                if (idx2 > -1) { l2 = li; s2 = idx2; }
              }
            });

            if (l1 > -1 && s1 > -1 && l2 > -1 && s2 > -1) {
              currentClass.lines[l1][s1] = targetStudentName;
              currentClass.lines[l2][s2] = this.draggedStudentName;
            } else if (l2 > -1 && s2 > -1) {
              currentClass.lines[l2][s2] = this.draggedStudentName;
              if (!currentClass.unplacedStudents) currentClass.unplacedStudents = [];
              if (!currentClass.unplacedStudents.includes(targetStudentName)) {
                currentClass.unplacedStudents.push(targetStudentName);
              }
            }
          }
        } else if (['half', 'third', 'fourth', 'fifth', 'sixth'].includes(layout)) {
          const groupArr = currentClass.layoutsData ? currentClass.layoutsData[layout] : null;
          if (Array.isArray(groupArr)) {
            let g1 = -1, s1 = -1;
            let g2 = -1, s2 = -1;

            groupArr.forEach((g, gi) => {
              if (Array.isArray(g)) {
                const idx1 = g.indexOf(this.draggedStudentName);
                if (idx1 > -1) { g1 = gi; s1 = idx1; }
                const idx2 = g.indexOf(targetStudentName);
                if (idx2 > -1) { g2 = gi; s2 = idx2; }
              }
            });

            if (g1 > -1 && s1 > -1 && g2 > -1 && s2 > -1) {
              groupArr[g1][s1] = targetStudentName;
              groupArr[g2][s2] = this.draggedStudentName;
            } else if (g2 > -1 && s2 > -1) {
              groupArr[g2][s2] = this.draggedStudentName;
              if (!currentClass.unplacedStudents) currentClass.unplacedStudents = [];
              if (!currentClass.unplacedStudents.includes(targetStudentName)) {
                currentClass.unplacedStudents.push(targetStudentName);
              }
            }
          }
        } else {
          // Rows layout
          if (currentClass.divideRows && Array.isArray(currentClass.dividedRowsData)) {
            let r1 = -1, sec1 = -1, s1 = -1;
            let r2 = -1, sec2 = -1, s2 = -1;

            currentClass.dividedRowsData.forEach((rowSecs, ri) => {
              if (Array.isArray(rowSecs)) {
                rowSecs.forEach((sec, seci) => {
                  if (Array.isArray(sec)) {
                    const idx1 = sec.indexOf(this.draggedStudentName);
                    if (idx1 > -1) { r1 = ri; sec1 = seci; s1 = idx1; }
                    const idx2 = sec.indexOf(targetStudentName);
                    if (idx2 > -1) { r2 = ri; sec2 = seci; s2 = idx2; }
                  }
                });
              }
            });

            if (r1 > -1 && s1 > -1 && r2 > -1 && s2 > -1) {
              currentClass.dividedRowsData[r1][sec1][s1] = targetStudentName;
              currentClass.dividedRowsData[r2][sec2][s2] = this.draggedStudentName;
            } else if (r2 > -1 && s2 > -1) {
              currentClass.dividedRowsData[r2][sec2][s2] = this.draggedStudentName;
              if (!currentClass.unplacedStudents) currentClass.unplacedStudents = [];
              if (!currentClass.unplacedStudents.includes(targetStudentName)) {
                currentClass.unplacedStudents.push(targetStudentName);
              }
            }
          } else if (Array.isArray(currentClass.rows)) {
            let r1 = -1, s1 = -1;
            let r2 = -1, s2 = -1;

            currentClass.rows.forEach((row, ri) => {
              if (Array.isArray(row)) {
                const idx1 = row.indexOf(this.draggedStudentName);
                if (idx1 > -1) { r1 = ri; s1 = idx1; }
                const idx2 = row.indexOf(targetStudentName);
                if (idx2 > -1) { r2 = ri; s2 = idx2; }
              }
            });

            if (r1 > -1 && s1 > -1 && r2 > -1 && s2 > -1) {
              currentClass.rows[r1][s1] = targetStudentName;
              currentClass.rows[r2][s2] = this.draggedStudentName;
            } else if (r2 > -1 && s2 > -1) {
              currentClass.rows[r2][s2] = this.draggedStudentName;
              if (!currentClass.unplacedStudents) currentClass.unplacedStudents = [];
              if (!currentClass.unplacedStudents.includes(targetStudentName)) {
                currentClass.unplacedStudents.push(targetStudentName);
              }
            }
          }
        }

        this.resetDragState();
        this.saveData();
        this.render();
      }

      handleDropOnCircleSeat(e, targetStudentName) {
        if (!this.isEditMode) return;
        e.preventDefault();
        e.stopPropagation();

        const seatEl = e.currentTarget;
        seatEl.classList.remove('drag-over');

        if (!this.draggedStudentName || this.draggedStudentName === targetStudentName) return;

        const currentClass = this.getCurrentClass();
        if (!currentClass || currentClass.layout !== 'circle') return;

        if (!currentClass.circle) currentClass.circle = [];
        let circleArr = [...currentClass.circle];

        circleArr = circleArr.filter(n => n !== this.draggedStudentName);

        const targetIndex = circleArr.indexOf(targetStudentName);
        if (targetIndex > -1) {
          circleArr.splice(targetIndex, 0, this.draggedStudentName);
        } else {
          circleArr.push(this.draggedStudentName);
        }

        currentClass.circle = circleArr;
        this.resetDragState();
        this.saveData();
        this.render();
      }

      handleDropOnRosterItem(e, targetIndex) {
        if (!this.isEditMode) return;
        e.preventDefault();
        e.stopPropagation();

        const itemEl = e.currentTarget;
        if (itemEl) itemEl.classList.remove('drag-over');

        if (!this.draggedStudentName) return;

        const currentClass = this.getCurrentClass();
        if (!currentClass) return;

        if (Array.isArray(currentClass.unplacedStudents)) {
          currentClass.unplacedStudents = currentClass.unplacedStudents.filter(n => n !== this.draggedStudentName);
        }

        const layout = currentClass.layout;

        if (layout === 'circle') {
          if (!currentClass.circle) currentClass.circle = [];
          let circleArr = [...currentClass.circle].filter(n => n !== this.draggedStudentName);

          const clampedIndex = Math.max(0, Math.min(targetIndex, circleArr.length));
          circleArr.splice(clampedIndex, 0, this.draggedStudentName);
          currentClass.circle = circleArr;
        } else if (layout === 'lines') {
          const lineCapacities = (currentClass.lines || []).map(l => Array.isArray(l) ? l.length : 0);

          let all = [];
          if (currentClass.lines) currentClass.lines.forEach(l => { if (Array.isArray(l)) all.push(...l); });
          all = all.filter(n => n !== this.draggedStudentName);

          const clampedIndex = Math.max(0, Math.min(targetIndex, all.length));
          all.splice(clampedIndex, 0, this.draggedStudentName);

          const updatedLines = [];
          let currentIdx = 0;

          lineCapacities.forEach(cap => {
            updatedLines.push(all.slice(currentIdx, currentIdx + cap));
            currentIdx += cap;
          });

          if (currentIdx < all.length) {
            if (updatedLines.length === 0) updatedLines.push([]);
            updatedLines[updatedLines.length - 1].push(...all.slice(currentIdx));
          }

          currentClass.lines = updatedLines;
        } else if (['half', 'third', 'fourth', 'fifth', 'sixth'].includes(layout)) {
          const groupArr = currentClass.layoutsData ? currentClass.layoutsData[layout] : [];
          const groupCapacities = groupArr.map(g => Array.isArray(g) ? g.length : 0);

          let all = groupArr.flat().filter(n => n !== this.draggedStudentName);
          const clampedIndex = Math.max(0, Math.min(targetIndex, all.length));
          all.splice(clampedIndex, 0, this.draggedStudentName);

          const updatedGroups = [];
          let currentIdx = 0;
          groupCapacities.forEach(cap => {
            updatedGroups.push(all.slice(currentIdx, currentIdx + cap));
            currentIdx += cap;
          });
          if (currentIdx < all.length) {
            if (updatedGroups.length === 0) updatedGroups.push([]);
            updatedGroups[updatedGroups.length - 1].push(...all.slice(currentIdx));
          }
          currentClass.layoutsData[layout] = updatedGroups;
        } else {
          // Rows layout (support divideRows and normal rows)
          if (currentClass.divideRows && Array.isArray(currentClass.dividedRowsData)) {
            const secCapacities = [];
            let all = [];
            currentClass.dividedRowsData.forEach(rSecs => {
              const cap0 = Array.isArray(rSecs[0]) ? rSecs[0].length : 0;
              const cap1 = Array.isArray(rSecs[1]) ? rSecs[1].length : 0;
              secCapacities.push([cap0, cap1]);
              if (Array.isArray(rSecs[0])) all.push(...rSecs[0]);
              if (Array.isArray(rSecs[1])) all.push(...rSecs[1]);
            });

            all = all.filter(n => n !== this.draggedStudentName);
            const clampedIndex = Math.max(0, Math.min(targetIndex, all.length));
            all.splice(clampedIndex, 0, this.draggedStudentName);

            const updatedDividedRows = [];
            let currentIdx = 0;

            secCapacities.forEach(([cap0, cap1]) => {
              const sec0 = all.slice(currentIdx, currentIdx + cap0);
              currentIdx += cap0;
              const sec1 = all.slice(currentIdx, currentIdx + cap1);
              currentIdx += cap1;
              updatedDividedRows.push([sec0, sec1]);
            });

            if (currentIdx < all.length) {
              if (updatedDividedRows.length === 0) updatedDividedRows.push([[], []]);
              updatedDividedRows[updatedDividedRows.length - 1][1].push(...all.slice(currentIdx));
            }

            currentClass.dividedRowsData = updatedDividedRows;

            // Keep currentClass.rows in sync
            for (let r = 0; r < (currentClass.rowsCount || 4); r++) {
              const rSecs = currentClass.dividedRowsData[r];
              if (rSecs) {
                currentClass.rows[r] = [...(rSecs[0] || []), ...(rSecs[1] || [])];
              }
            }
          } else {
            const rowCapacities = (currentClass.rows || []).map(r => Array.isArray(r) ? r.length : 0);

            let all = [];
            if (currentClass.rows) currentClass.rows.forEach(r => { if (Array.isArray(r)) all.push(...r); });
            all = all.filter(n => n !== this.draggedStudentName);

            const clampedIndex = Math.max(0, Math.min(targetIndex, all.length));
            all.splice(clampedIndex, 0, this.draggedStudentName);

            const updatedRows = [];
            let currentIdx = 0;

            rowCapacities.forEach(cap => {
              updatedRows.push(all.slice(currentIdx, currentIdx + cap));
              currentIdx += cap;
            });

            if (currentIdx < all.length) {
              if (updatedRows.length === 0) updatedRows.push([]);
              updatedRows[updatedRows.length - 1].push(...all.slice(currentIdx));
            }

            currentClass.rows = updatedRows;
          }
        }

        this.resetDragState();
        this.saveData();
        this.render();
      }

      handleDragEnterSeat(e) {
        if (!this.isEditMode) return;
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
      }

      handleDragLeaveSeat(e) {
        if (!this.isEditMode) return;
        e.currentTarget.classList.remove('drag-over');
      }

      handleGroupDragStart(e, groupIndex) {
        if (!this.isEditMode) return;
        this.draggedGroupIndex = groupIndex;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', 'group-' + groupIndex);
        e.stopPropagation();

        document.body.classList.add('group-dragging-active');

        const box = document.getElementById(`group-box-${groupIndex}`);
        if (box) box.classList.add('group-dragging');
      }

      handleGroupDragOver(e, targetIndex) {
        if (!this.isEditMode || this.draggedGroupIndex === null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const box = document.getElementById(`group-box-${targetIndex}`);
        if (!box) return;

        const rect = box.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const width = rect.width;

        box.classList.remove('group-drop-target', 'group-drop-left', 'group-drop-right');

        if (mouseX < width * 0.3) {
          box.classList.add('group-drop-left');
        } else if (mouseX > width * 0.7) {
          box.classList.add('group-drop-right');
        } else {
          box.classList.add('group-drop-target');
        }
      }

      handleGroupDragEnter(e, targetIndex) {
        if (!this.isEditMode || this.draggedGroupIndex === null) return;
        e.preventDefault();
      }

      handleGroupDragLeave(e, targetIndex) {
        if (!this.isEditMode || this.draggedGroupIndex === null) return;
        const box = document.getElementById(`group-box-${targetIndex}`);
        if (box && !box.contains(e.relatedTarget)) {
          box.classList.remove('group-drop-target', 'group-drop-left', 'group-drop-right');
        }
      }

      handleGroupDrop(e, targetIndex, layoutType) {
        if (!this.isEditMode || this.draggedGroupIndex === null) return;
        e.preventDefault();
        e.stopPropagation();

        const box = document.getElementById(`group-box-${targetIndex}`);
        let mode = 'swap';
        if (box) {
          if (box.classList.contains('group-drop-left')) mode = 'left';
          else if (box.classList.contains('group-drop-right')) mode = 'right';
          box.classList.remove('group-drop-target', 'group-drop-left', 'group-drop-right');
        }

        const currentClass = this.getCurrentClass();
        if (!currentClass || !currentClass.layoutsData || !currentClass.layoutsData[layoutType]) return;

        if (mode === 'swap') {
          // Swap student arrays between tables
          const groups = currentClass.layoutsData[layoutType];
          const temp = groups[this.draggedGroupIndex];
          groups[this.draggedGroupIndex] = groups[targetIndex];
          groups[targetIndex] = temp;
        } else {
          // Reorder table position (left or right of target)
          const groups = currentClass.layoutsData[layoutType];
          const fromIdx = this.draggedGroupIndex;
          if (fromIdx !== targetIndex) {
            const movedGroup = groups.splice(fromIdx, 1)[0];
            let insertIdx = targetIndex;
            if (fromIdx < targetIndex) {
              insertIdx = mode === 'left' ? targetIndex - 1 : targetIndex;
            } else {
              insertIdx = mode === 'right' ? targetIndex + 1 : targetIndex;
            }
            insertIdx = Math.max(0, Math.min(insertIdx, groups.length));
            groups.splice(insertIdx, 0, movedGroup);
          }
        }

        this.saveData();
        this.render();
        this.resetDragState();
      }

      handleRowDrop(e, targetRowIdx, layoutType) {
        if (!this.isEditMode || this.draggedGroupIndex === null) return;
        e.preventDefault();
        e.stopPropagation();

        const currentClass = this.getCurrentClass();
        if (!currentClass || !currentClass.layoutsData) return;

        const rowKey = `${layoutType}Rows`;
        let rows = currentClass.layoutsData[rowKey];
        if (!rows) return;

        const gIdx = this.draggedGroupIndex;

        // Move groupIndex into targetRowIdx
        rows = rows.map(r => r.filter(id => id !== gIdx));
        if (!rows[targetRowIdx]) rows[targetRowIdx] = [];
        rows[targetRowIdx].push(gIdx);

        // Clean up empty rows
        currentClass.layoutsData[rowKey] = rows.filter(r => r.length > 0);

        this.saveData();
        this.render();
        this.resetDragState();
      }

      handleNewRowDrop(e, layoutType) {
        if (!this.isEditMode || this.draggedGroupIndex === null) return;
        e.preventDefault();
        e.stopPropagation();

        const currentClass = this.getCurrentClass();
        if (!currentClass || !currentClass.layoutsData) return;

        const rowKey = `${layoutType}Rows`;
        let rows = currentClass.layoutsData[rowKey];
        if (!rows) rows = [];

        const gIdx = this.draggedGroupIndex;

        // Remove from existing row
        rows = rows.map(r => r.filter(id => id !== gIdx)).filter(r => r.length > 0);

        // Create new bottom row
        rows.push([gIdx]);
        currentClass.layoutsData[rowKey] = rows;

        this.saveData();
        this.render();
        this.resetDragState();
      }

      handleDragEnd(e) {
        this.resetDragState();
        document.body.classList.remove('group-dragging-active');
        document.querySelectorAll('.seat.dragging, .roster-item.dragging').forEach(el => el.classList.remove('dragging'));
        document.querySelectorAll('.seat.drag-over, .roster-item.drag-over, .group-box.drag-over').forEach(el => el.classList.remove('drag-over'));
        document.querySelectorAll('.group-box.group-dragging').forEach(el => el.classList.remove('group-dragging'));
        document.querySelectorAll('.group-box.group-drop-target, .group-box.group-drop-left, .group-box.group-drop-right').forEach(el => {
          el.classList.remove('group-drop-target', 'group-drop-left', 'group-drop-right');
        });
        document.querySelectorAll('.group-row-slot.row-drop-target, .row-add-bottom-zone.drag-over').forEach(el => {
          el.classList.remove('row-drop-target', 'drag-over');
        });
      }

      resetDragState() {
        this.draggedStudentName = null;
        this.sourceGroupIndex = null;
        this.draggedGroupIndex = null;
      }

      playCameraSound() {
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (!AudioContext) return;
          const ctx = new AudioContext();

          // 1. Shutter noise burst
          const bufferSize = ctx.sampleRate * 0.04;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }

          const noise = ctx.createBufferSource();
          noise.buffer = buffer;

          const filter = ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.value = 1000;

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          noise.start();

          // 2. Mechanical click tone
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(400, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.03);

          oscGain.gain.setValueAtTime(0.4, ctx.currentTime);
          oscGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);

          osc.connect(oscGain);
          oscGain.connect(ctx.destination);

          osc.start();
          osc.stop(ctx.currentTime + 0.03);
        } catch (e) {
          // Audio fallback
        }
      }

      triggerCameraClick(btnEl) {
        this.playCameraSound();

        if (btnEl) {
          btnEl.classList.add('camera-btn-flash');
          setTimeout(() => {
            btnEl.classList.remove('camera-btn-flash');
          }, 250);
        }

        // 1. Screen flash visual effect
        const flashOverlay = document.createElement('div');
        flashOverlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: white; opacity: 0.6; z-index: 10000; pointer-events: none; transition: opacity 0.25s ease-out;';
        document.body.appendChild(flashOverlay);

        setTimeout(() => {
          flashOverlay.style.opacity = '0';
          setTimeout(() => {
            if (flashOverlay.parentNode) {
              flashOverlay.parentNode.removeChild(flashOverlay);
            }
          }, 250);
        }, 50);

        // 2. Full Seating Chart Snapshot & JPEG Export
        const currentClass = this.getCurrentClass();
        const className = (currentClass && currentClass.name) ? currentClass.name : 'Class Seating Chart';

        const wrapper = document.createElement('div');
        wrapper.className = 'snapshot-export-wrapper';
        wrapper.style.cssText = 'position: absolute; left: -9999px; top: -9999px; background: #ffffff; padding: 32px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; box-sizing: border-box; font-family: Segoe UI, system-ui, -apple-system, sans-serif; width: 1100px; min-height: 700px;';

        // Class Name Title Banner
        const titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-size: 1.8rem; font-weight: 800; color: #0f172a; text-align: center; margin-bottom: 20px; letter-spacing: 0.5px;';
        titleEl.textContent = className;
        wrapper.appendChild(titleEl);

        // Chalkboard Front Banner
        const chalkboard = document.getElementById('chalkboardFront');
        if (chalkboard && (!currentClass || currentClass.layout !== 'circle')) {
          const cbClone = chalkboard.cloneNode(true);
          cbClone.style.margin = '0 0 24px 0';
          cbClone.style.width = '550px';
          cbClone.style.maxWidth = '100%';
          wrapper.appendChild(cbClone);
        }

        // Full Seating Chart Container Clone
        const chartContainer = document.getElementById('chartContainer');
        if (chartContainer) {
          const chartClone = chartContainer.cloneNode(true);
          chartClone.querySelectorAll('.row-align-dots, .circle-dial-container, .group-drag-handle, .resize-handle, .remove-btn').forEach(el => el.remove());
          chartClone.style.maxWidth = '1000px';
          chartClone.style.width = '100%';
          chartClone.style.minHeight = 'auto';
          wrapper.appendChild(chartClone);
        }

        document.body.appendChild(wrapper);

        const performDownload = (canvas) => {
          try {
            const jpegUrl = canvas.toDataURL('image/jpeg', 0.92);
            const link = document.createElement('a');
            const rawLayout = (currentClass && currentClass.layout) ? currentClass.layout : 'rows';
            const layoutName = rawLayout.charAt(0).toUpperCase() + rawLayout.slice(1);
            const safeClassName = className.replace(/[^a-z0-9]/gi, '_');
            const safeFileName = `${safeClassName}_${layoutName}_Seating_Chart.jpeg`;
            link.download = safeFileName;
            link.href = jpegUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } catch (e) {
            console.error("Download failed:", e);
          } finally {
            if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
          }
        };

        if (typeof window.html2canvas === 'function') {
          window.html2canvas(wrapper, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0,
            width: wrapper.scrollWidth,
            height: wrapper.scrollHeight
          }).then(performDownload).catch(err => {
            if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
          });
        } else {
          setTimeout(() => {
            if (typeof window.html2canvas === 'function') {
              window.html2canvas(wrapper, { scale: 2, backgroundColor: '#ffffff' }).then(performDownload);
            } else if (wrapper.parentNode) {
              wrapper.parentNode.removeChild(wrapper);
            }
          }, 300);
        }
      }

      triggerAttendanceCameraClick(btnEl) {
        this.playCameraSound();

        if (btnEl) {
          btnEl.classList.add('camera-btn-flash');
          setTimeout(() => {
            btnEl.classList.remove('camera-btn-flash');
          }, 250);
        }

        // Screen flash visual effect
        const flashOverlay = document.createElement('div');
        flashOverlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: white; opacity: 0.6; z-index: 10000; pointer-events: none; transition: opacity 0.25s ease-out;';
        document.body.appendChild(flashOverlay);

        setTimeout(() => {
          flashOverlay.style.opacity = '0';
          setTimeout(() => {
            if (flashOverlay.parentNode) {
              flashOverlay.parentNode.removeChild(flashOverlay);
            }
          }, 250);
        }, 50);

        const currentClass = this.getCurrentClass();
        if (!currentClass) return;

        const rawClassName = currentClass.name || 'Class';
        const safeClassName = rawClassName.replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_');
        const classList = currentClass.classList || [];
        const dates = Array.isArray(currentClass.attendanceDates) ? currentClass.attendanceDates : this.getDefaultAttendanceDates();

        // Calculate exact required width so no names or date columns overlap
        const minWidth = Math.max(900, 260 + dates.length * 80);

        const wrapper = document.createElement('div');
        wrapper.className = 'snapshot-export-wrapper';
        wrapper.style.cssText = `position: absolute; left: -9999px; top: -9999px; background: #ffffff; padding: 32px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; box-sizing: border-box; font-family: Segoe UI, system-ui, -apple-system, sans-serif; width: ${minWidth}px;`;

        // Banner Title
        const titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-size: 1.75rem; font-weight: 800; color: #0f172a; text-align: center; margin-bottom: 24px; letter-spacing: 0.5px;';
        titleEl.textContent = `${rawClassName} — Attendance Register`;
        wrapper.appendChild(titleEl);

        // Build pristine export table (standard table, no position:sticky!)
        const exportTable = document.createElement('table');
        exportTable.style.cssText = 'width: 100%; border-collapse: collapse; background: #ffffff; font-size: 0.95rem; font-family: inherit; text-align: center;';

        // Table Header
        let theadHTML = '<thead><tr style="background-color: #f8fafc;">';
        theadHTML += '<th style="padding: 12px 16px; border: 1px solid #cbd5e1; font-weight: 700; color: #0f172a; text-align: left; min-width: 220px; background-color: #f1f5f9;">Student Name</th>';
        dates.forEach(d => {
          theadHTML += `<th style="padding: 10px 12px; border: 1px solid #cbd5e1; min-width: 65px; background-color: #f8fafc; vertical-align: middle;">
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.25;">
              <span style="font-weight: 800; font-size: 0.9rem; color: #0f172a;">${d.date}</span>
              <span style="font-weight: 600; font-size: 0.75rem; color: #64748b; margin-top: 2px;">${d.day}</span>
            </div>
          </th>`;
        });
        theadHTML += '</tr></thead>';

        // Table Body
        let tbodyHTML = '<tbody>';
        if (classList.length === 0) {
          tbodyHTML += `<tr><td colspan="${dates.length + 1}" style="padding: 30px; text-align: center; color: #94a3b8; font-style: italic; border: 1px solid #cbd5e1;">No students in this class list</td></tr>`;
        } else {
          classList.forEach((student, rIdx) => {
            const profile = this.getStudentProfile(currentClass, student);
            const fullName = (profile.lastName && profile.lastName.trim())
              ? `${profile.firstName} ${profile.lastName}`
              : (profile.firstName || student);

            let presentCount = 0;
            let dateCells = '';

            dates.forEach(d => {
              let status = (d.statuses && d.statuses[student] !== undefined) ? d.statuses[student] : null;
              if (status === null) {
                const seedStr = `${currentClass.id}_${student}_${d.date}`;
                let hash = 0;
                for (let i = 0; i < seedStr.length; i++) {
                  hash = ((hash << 5) - hash) + seedStr.charCodeAt(i);
                  hash |= 0;
                }
                status = ((Math.abs(hash) % 10) >= 3) ? 'present' : 'absent';
              }

              if (status === 'present') {
                presentCount++;
                dateCells += `<td style="padding: 8px; border: 1px solid #e2e8f0; vertical-align: middle;">
                  <span style="color: #10b981; font-weight: 800; font-size: 1.1rem; display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 50%; background: #ecfdf5; border: 1px solid #a7f3d0;">✓</span>
                </td>`;
              } else if (status === 'absent') {
                dateCells += `<td style="padding: 8px; border: 1px solid #e2e8f0; vertical-align: middle;">
                  <span style="color: #ef4444; font-weight: 800; font-size: 1rem; display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 50%; background: #fef2f2; border: 1px solid #fecaca;">✕</span>
                </td>`;
              } else {
                dateCells += `<td style="padding: 8px; border: 1px solid #e2e8f0; vertical-align: middle;"></td>`;
              }
            });

            const ratioText = `(${presentCount}/${dates.length})`;
            const rowBg = (rIdx % 2 === 1) ? '#f8fafc' : '#ffffff';

            tbodyHTML += `<tr style="background-color: ${rowBg};">
              <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-weight: 600; color: #0f172a; text-align: left;">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                  <span>${this.escapeHtml(fullName)}</span>
                  <span style="font-size: 0.8rem; font-weight: 800; color: var(--primary); background: #e0e7ff; padding: 2px 7px; border-radius: 12px; white-space: nowrap;">${ratioText}</span>
                </div>
              </td>
              ${dateCells}
            </tr>`;
          });
        }
        tbodyHTML += '</tbody>';

        exportTable.innerHTML = theadHTML + tbodyHTML;
        wrapper.appendChild(exportTable);
        document.body.appendChild(wrapper);

        const performDownload = (canvas) => {
          if (wrapper.parentNode) {
            wrapper.parentNode.removeChild(wrapper);
          }
          const link = document.createElement('a');
          link.download = `${safeClassName}_Attendance_Register.jpeg`;
          link.href = canvas.toDataURL('image/jpeg', 0.95);
          link.click();
        };

        if (typeof html2canvas === 'function') {
          html2canvas(wrapper, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' })
            .then(performDownload)
            .catch(err => {
              if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
              console.error('Attendance snapshot error:', err);
            });
        } else if (typeof window.html2canvas === 'function') {
          window.html2canvas(wrapper, { scale: 2, backgroundColor: '#ffffff' })
            .then(performDownload)
            .catch(err => {
              if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
              console.error('Attendance snapshot error:', err);
            });
        } else {
          if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
        }
      }

      triggerGradesCameraClick(btnEl) {
        this.playCameraSound();

        if (btnEl) {
          btnEl.classList.add('camera-btn-flash');
          setTimeout(() => {
            btnEl.classList.remove('camera-btn-flash');
          }, 250);
        }

        const flashOverlay = document.createElement('div');
        flashOverlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: white; opacity: 0.6; z-index: 10000; pointer-events: none; transition: opacity 0.25s ease-out;';
        document.body.appendChild(flashOverlay);

        setTimeout(() => {
          flashOverlay.style.opacity = '0';
          setTimeout(() => {
            if (flashOverlay.parentNode) {
              flashOverlay.parentNode.removeChild(flashOverlay);
            }
          }, 250);
        }, 50);

        const currentClass = this.getCurrentClass();
        if (!currentClass) return;

        const rawClassName = currentClass.name || 'Class';
        const safeClassName = rawClassName.replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_');
        const classList = currentClass.classList || [];
        const gradeCols = Array.isArray(currentClass.gradeColumns) ? currentClass.gradeColumns : this.getDefaultGradeColumns();

        const minWidth = Math.max(900, 260 + gradeCols.length * 90);

        const wrapper = document.createElement('div');
        wrapper.className = 'snapshot-export-wrapper';
        wrapper.style.cssText = `position: absolute; left: -9999px; top: -9999px; background: #ffffff; padding: 32px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; box-sizing: border-box; font-family: Segoe UI, system-ui, -apple-system, sans-serif; width: ${minWidth}px;`;

        const titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-size: 1.75rem; font-weight: 800; color: #0f172a; text-align: center; margin-bottom: 24px; letter-spacing: 0.5px;';
        titleEl.textContent = `${rawClassName} — Grades Register`;
        wrapper.appendChild(titleEl);

        const exportTable = document.createElement('table');
        exportTable.style.cssText = 'width: 100%; border-collapse: collapse; background: #ffffff; font-size: 0.95rem; font-family: inherit; text-align: center;';

        let theadHTML = '<thead><tr style="background-color: #f8fafc;">';
        theadHTML += '<th style="padding: 12px 16px; border: 1px solid #cbd5e1; font-weight: 700; color: #0f172a; text-align: left; min-width: 220px; background-color: #f1f5f9;">Student Name</th>';
        gradeCols.forEach(col => {
          const theme = this.getCategoryTheme(col.title);
          theadHTML += `<th style="padding: 10px 12px; border: 1px solid ${theme.border}; min-width: 80px; background-color: ${theme.bgCell}; vertical-align: middle;">
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.25;">
              <span style="font-weight: 800; font-size: 0.85rem; color: ${theme.color}; background: ${theme.bgHeader}; padding: 2px 8px; border-radius: 12px; border: 1px solid ${theme.border};">${this.escapeHtml(col.title || 'Grade')}</span>
              <span style="font-weight: 700; font-size: 0.8rem; color: #0f172a; margin-top: 3px;">${col.date}</span>
            </div>
          </th>`;
        });
        theadHTML += '</tr></thead>';

        let tbodyHTML = '<tbody>';
        if (classList.length === 0) {
          tbodyHTML += `<tr><td colspan="${gradeCols.length + 1}" style="padding: 30px; text-align: center; color: #94a3b8; font-style: italic; border: 1px solid #cbd5e1;">No students in this class list</td></tr>`;
        } else {
          classList.forEach((student, rIdx) => {
            const profile = this.getStudentProfile(currentClass, student);
            const fullName = (profile.lastName && profile.lastName.trim())
              ? `${profile.firstName} ${profile.lastName}`
              : (profile.firstName || student);

            let gradeCells = '';

            gradeCols.forEach(col => {
              const theme = this.getCategoryTheme(col.title);
              const gradeVal = (col.grades && col.grades[student] !== undefined) ? col.grades[student] : '';

              if (gradeVal === 'check' || gradeVal === 'plus') {
                gradeCells += `<td style="padding: 8px; border: 1px solid ${theme.border}; background-color: ${theme.bgCell}; vertical-align: middle;">
                  <span style="color: #10b981; font-weight: 900; font-size: 1.1rem; display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 50%; background: #ecfdf5; border: 1px solid #a7f3d0;">+</span>
                </td>`;
              } else if (gradeVal === 'minus') {
                gradeCells += `<td style="padding: 8px; border: 1px solid ${theme.border}; background-color: ${theme.bgCell}; vertical-align: middle;">
                  <span style="color: #ef4444; font-weight: 900; font-size: 1.2rem; display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 50%; background: #fef2f2; border: 1px solid #fecaca;">−</span>
                </td>`;
              } else if (gradeVal === 'x') {
                gradeCells += `<td style="padding: 8px; border: 1px solid ${theme.border}; background-color: ${theme.bgCell}; vertical-align: middle;">
                  <span style="color: #dc2626; font-weight: 900; font-size: 1rem; display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 50%; background: #fef2f2; border: 1px solid #fecaca;">✕</span>
                </td>`;
              } else {
                gradeCells += `<td style="padding: 8px; border: 1px solid ${theme.border}; background-color: ${theme.bgCell}; vertical-align: middle;"></td>`;
              }
            });

            const showGradesRatio = currentClass ? (currentClass.showGradesAttendanceRatio !== false) : true;
            const ratioText = showGradesRatio ? this.getStudentAttendanceRatio(currentClass, student) : '';
            const ratioHTML = showGradesRatio ? `<span style="font-size: 0.8rem; font-weight: 700; color: #4f46e5; background: #e0e7ff; padding: 2px 6px; border-radius: 10px; margin-left: 8px;">${ratioText}</span>` : '';
            const rowBg = (rIdx % 2 === 1) ? '#ffffff' : '#ffffff';
            tbodyHTML += `<tr style="background-color: ${rowBg};">
              <td style="padding: 10px 14px; border: 1px solid #cbd5e1; font-weight: 600; color: #0f172a; text-align: left; background-color: #ffffff;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span>${this.escapeHtml(fullName)}</span>
                  ${ratioHTML}
                </div>
              </td>
              ${gradeCells}
            </tr>`;
          });
        }
        tbodyHTML += '</tbody>';

        exportTable.innerHTML = theadHTML + tbodyHTML;
        wrapper.appendChild(exportTable);
        document.body.appendChild(wrapper);

        const performDownload = (canvas) => {
          if (wrapper.parentNode) {
            wrapper.parentNode.removeChild(wrapper);
          }
          const link = document.createElement('a');
          link.download = `${safeClassName}_Grades_Register.jpeg`;
          link.href = canvas.toDataURL('image/jpeg', 0.95);
          link.click();
        };

        if (typeof html2canvas === 'function') {
          html2canvas(wrapper, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' })
            .then(performDownload)
            .catch(err => {
              if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
              console.error('Grades snapshot error:', err);
            });
        } else if (typeof window.html2canvas === 'function') {
          window.html2canvas(wrapper, { scale: 2, backgroundColor: '#ffffff' })
            .then(performDownload)
            .catch(err => {
              if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
              console.error('Grades snapshot error:', err);
            });
        } else {
          if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
        }
      }

      makeResizable(el, sizeKey) {
        if (!el || !sizeKey) return;

        let handleBR = el.querySelector('.resize-handle-br');
        if (!handleBR) {
          handleBR = document.createElement('div');
          handleBR.className = 'resize-handle resize-handle-br';
          handleBR.title = 'Resize from Bottom-Right';
          handleBR.innerHTML = '◢';
          el.appendChild(handleBR);
        }

        let handleBL = el.querySelector('.resize-handle-bl');
        if (!handleBL) {
          handleBL = document.createElement('div');
          handleBL.className = 'resize-handle resize-handle-bl';
          handleBL.title = 'Resize from Bottom-Left';
          handleBL.innerHTML = '◣';
          el.appendChild(handleBL);
        }

        const startResize = (e, direction) => {
          if (!this.isEditMode) return;
          e.preventDefault();
          e.stopPropagation();

          const isRow = el.classList.contains('seat-row');
          const startX = e.clientX;
          const startY = e.clientY;
          const startWidth = el.offsetWidth;
          const startHeight = el.offsetHeight;

          const parentContainer = el.parentElement;
          const containerWidth = parentContainer ? parentContainer.clientWidth : 1000;
          const gap = 20;

          const onMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;

            if (!isRow) {
              let newWidth = startWidth;
              if (direction === 'br') {
                newWidth = startWidth + deltaX;
              } else if (direction === 'bl') {
                newWidth = startWidth - deltaX;
              }

              // Calculate remaining width from sibling boxes in the same row slot
              let maxAllowedWidth = containerWidth;
              if (parentContainer) {
                const siblings = Array.from(parentContainer.querySelectorAll('.group-box')).filter(b => b !== el);
                const totalSiblingsWidth = siblings.reduce((sum, b) => sum + b.offsetWidth, 0);
                const totalGaps = siblings.length * gap + 40;
                maxAllowedWidth = Math.max(150, containerWidth - totalSiblingsWidth - totalGaps);
              }

              if (newWidth >= 120 && newWidth <= maxAllowedWidth) {
                el.style.width = `${newWidth}px`;
              } else if (newWidth > maxAllowedWidth) {
                el.style.width = `${maxAllowedWidth}px`;
              }
            }

            const newHeight = startHeight + deltaY;
            if (newHeight >= 60) {
              if (isRow) {
                el.style.minHeight = `${newHeight}px`;
              } else {
                el.style.height = `${newHeight}px`;
              }
            }
          };

          const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            const currentClass = this.getCurrentClass();
            if (currentClass) {
              if (!currentClass.containerSizes) currentClass.containerSizes = {};
              currentClass.containerSizes[sizeKey] = {
                width: el.offsetWidth,
                height: el.offsetHeight
              };
              this.saveData();
            }
          };

          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        };

        handleBR.onmousedown = (e) => startResize(e, 'br');
        handleBL.onmousedown = (e) => startResize(e, 'bl');
      }

      syncUnplacedWithClassList(currentClass) {
        if (!currentClass || !Array.isArray(currentClass.classList)) return;
        
        const allowedNames = new Set(currentClass.classList.filter(Boolean));

        // 1. Clean Rows Layout
        if (currentClass.divideRows && Array.isArray(currentClass.dividedRowsData)) {
          const seen = new Set();
          currentClass.dividedRowsData = currentClass.dividedRowsData.map(rSecs => {
            if (!Array.isArray(rSecs)) return [[], []];
            return rSecs.map(sec => {
              if (!Array.isArray(sec)) return [];
              return sec.filter(name => {
                if (allowedNames.has(name) && !seen.has(name)) {
                  seen.add(name);
                  return true;
                }
                return false;
              });
            });
          });

          if (Array.isArray(currentClass.rows)) {
            for (let r = 0; r < (currentClass.rowsCount || 4); r++) {
              const rSecs = currentClass.dividedRowsData[r];
              if (rSecs) {
                currentClass.rows[r] = [...(rSecs[0] || []), ...(rSecs[1] || [])];
              }
            }
          }
        } else if (Array.isArray(currentClass.rows)) {
          const seen = new Set();
          currentClass.rows = currentClass.rows.map(row => {
            if (!Array.isArray(row)) return [];
            return row.filter(name => {
              if (allowedNames.has(name) && !seen.has(name)) {
                seen.add(name);
                return true;
              }
              return false;
            });
          });
        }

        // 2. Clean Circle Layout
        if (Array.isArray(currentClass.circle)) {
          const seen = new Set();
          currentClass.circle = currentClass.circle.filter(name => {
            if (allowedNames.has(name) && !seen.has(name)) {
              seen.add(name);
              return true;
            }
            return false;
          });
        }

        // 3. Clean Lines Layout
        if (Array.isArray(currentClass.lines)) {
          const seen = new Set();
          currentClass.lines = currentClass.lines.map(line => {
            if (!Array.isArray(line)) return [];
            return line.filter(name => {
              if (allowedNames.has(name) && !seen.has(name)) {
                seen.add(name);
                return true;
              }
              return false;
            });
          });
        }

        // 3. Clean Group Layouts (only target group layout keys, not row metadata keys!)
        ['half', 'third', 'fourth', 'fifth', 'sixth'].forEach(layoutKey => {
          const groups = currentClass.layoutsData ? currentClass.layoutsData[layoutKey] : null;
          if (Array.isArray(groups)) {
            const seen = new Set();
            currentClass.layoutsData[layoutKey] = groups.map(g => {
              if (!Array.isArray(g)) return [];
              return g.filter(name => {
                if (allowedNames.has(name) && !seen.has(name)) {
                  seen.add(name);
                  return true;
                }
                return false;
              });
            });
          }
        });

        // 4. Ensure active group layout is populated if empty
        const activeLayout = currentClass.layout || 'rows';
        if (['half', 'third', 'fourth', 'fifth', 'sixth'].includes(activeLayout)) {
          const numGroups = activeLayout === 'half' ? 2 : activeLayout === 'third' ? 3 : activeLayout === 'fourth' ? 4 : activeLayout === 'fifth' ? 5 : 6;
          const gArr = currentClass.layoutsData ? currentClass.layoutsData[activeLayout] : null;
          if (!gArr || !Array.isArray(gArr) || gArr.length < numGroups || gArr.flat().length === 0) {
            if (!currentClass.layoutsData) currentClass.layoutsData = {};
            currentClass.layoutsData[activeLayout] = this.autoBalanceGroups([...allowedNames], numGroups);
          }
        }

        const seatedNames = new Set(this.getAllStudents());

        // 5. Clean & populate unplaced list for the active layout
        if (!Array.isArray(currentClass.unplacedStudents)) {
          currentClass.unplacedStudents = [];
        }
        
        const seenUnplaced = new Set();
        currentClass.unplacedStudents = currentClass.unplacedStudents.filter(name => {
          if (allowedNames.has(name) && !seatedNames.has(name) && !seenUnplaced.has(name)) {
            seenUnplaced.add(name);
            return true;
          }
          return false;
        });

        // Add any missing classList students that are not seated and not in unplacedStudents
        currentClass.classList.forEach(student => {
          if (student && !seatedNames.has(student) && !seenUnplaced.has(student)) {
            currentClass.unplacedStudents.push(student);
            seenUnplaced.add(student);
          }
        });
      }

      refreshTotalStudentsFromClassList() {
        const currentClass = this.getCurrentClass();
        if (!currentClass) return;
        this.syncUnplacedWithClassList(currentClass);
        this.saveData();
        this.render();
      }

      getRowsData(currentClass) {
        if (!currentClass) return [];
        if (!currentClass.rowsData) currentClass.rowsData = {};
        const countKey = String(currentClass.rowsCount || 4);

        if (!Array.isArray(currentClass.rowsData[countKey])) {
          if (Array.isArray(currentClass.rows) && currentClass.rows.length === parseInt(countKey, 10)) {
            currentClass.rowsData[countKey] = JSON.parse(JSON.stringify(currentClass.rows));
          } else {
            const all = (currentClass.classList && currentClass.classList.length > 0)
              ? [...currentClass.classList]
              : this.getAllClassStudents(currentClass);
            currentClass.rowsData[countKey] = this.autoBalanceGroups(all, parseInt(countKey, 10));
          }
        }

        currentClass.rows = currentClass.rowsData[countKey];
        return currentClass.rowsData[countKey];
      }

      setRowsData(currentClass, rowsArr) {
        if (!currentClass) return;
        if (!currentClass.rowsData) currentClass.rowsData = {};
        const countKey = String(currentClass.rowsCount || 4);
        currentClass.rowsData[countKey] = rowsArr;
        currentClass.rows = rowsArr;
      }

      getLinesData(currentClass) {
        if (!currentClass) return [];
        if (!currentClass.linesData) currentClass.linesData = {};
        const countKey = String(currentClass.linesCount || 4);

        if (!Array.isArray(currentClass.linesData[countKey])) {
          if (Array.isArray(currentClass.lines) && currentClass.lines.length === parseInt(countKey, 10)) {
            currentClass.linesData[countKey] = JSON.parse(JSON.stringify(currentClass.lines));
          } else {
            const all = (currentClass.classList && currentClass.classList.length > 0)
              ? [...currentClass.classList]
              : this.getAllClassStudents(currentClass);
            currentClass.linesData[countKey] = this.autoBalanceGroups(all, parseInt(countKey, 10));
          }
        }

        currentClass.lines = currentClass.linesData[countKey];
        return currentClass.linesData[countKey];
      }

      setLinesData(currentClass, linesArr) {
        if (!currentClass) return;
        if (!currentClass.linesData) currentClass.linesData = {};
        const countKey = String(currentClass.linesCount || 4);
        currentClass.linesData[countKey] = linesArr;
        currentClass.lines = linesArr;
      }

      setRowsCount(count) {
        if (isNaN(count) || count < 1 || count > 6) return;
        const currentClass = this.getCurrentClass();
        if (!currentClass) return;

        currentClass.rowsCount = count;
        this.getRowsData(currentClass);
      }

      setLinesCount(count) {
        if (isNaN(count) || count < 1 || count > 6) return;
        const currentClass = this.getCurrentClass();
        if (!currentClass) return;

        currentClass.linesCount = count;
        this.getLinesData(currentClass);
      }

      changeSubRowsCount(val) {
        const count = parseInt(val, 10);
        this.setRowsCount(count);
        this.saveData();
        this.render();
      }

      changeSubLinesCount(val) {
        const count = parseInt(val, 10);
        this.setLinesCount(count);
        this.saveData();
        this.render();
      }

      toggleSubDivideRow() {
        const currentClass = this.getCurrentClass();
        if (!currentClass) return;

        currentClass.divideRows = !currentClass.divideRows;
        this.saveData();
        this.render();
      }

      updateSubheaders() {
        const rowsSub = document.getElementById('rowsSubheader');
        const linesSub = document.getElementById('linesSubheader');

        const currentClass = this.getCurrentClass();
        const layoutBar = document.getElementById('layoutBar');
        const isLayoutBarOpen = layoutBar && layoutBar.classList.contains('open');

        const isEditingMain = currentClass && this.isEditMode && !this.isAttendanceView && !isLayoutBarOpen;

        if (rowsSub) {
          if (isEditingMain && currentClass.layout === 'rows') {
            rowsSub.style.display = 'flex';

            const subCountEl = document.getElementById('subRowsCount');
            if (subCountEl) subCountEl.value = currentClass.rowsCount || 4;

            const subDivideBtn = document.getElementById('subBtnDivideToggle');
            if (subDivideBtn) {
              const isDivided = currentClass.divideRows === true;
              subDivideBtn.textContent = isDivided ? 'YES' : 'NO';
              if (isDivided) {
                subDivideBtn.classList.remove('btn-secondary');
                subDivideBtn.classList.add('btn-primary');
              } else {
                subDivideBtn.classList.remove('btn-primary');
                subDivideBtn.classList.add('btn-secondary');
              }
            }
          } else {
            rowsSub.style.display = 'none';
          }
        }

        if (linesSub) {
          if (isEditingMain && currentClass.layout === 'lines') {
            linesSub.style.display = 'flex';

            const subLinesCountEl = document.getElementById('subLinesCount');
            if (subLinesCountEl) subLinesCountEl.value = currentClass.linesCount || 4;
          } else {
            linesSub.style.display = 'none';
          }
        }
      }

      render() {
        const currentClass = this.getCurrentClass();

        if (currentClass) {
          this.syncUnplacedWithClassList(currentClass);

          const layout = currentClass.layout;
          ['rows', 'lines', 'circle', 'half', 'third', 'fourth', 'fifth', 'sixth'].forEach(l => {
            const btn = document.getElementById(`btnLayout${l.charAt(0).toUpperCase() + l.slice(1)}`);
            if (btn) btn.classList.toggle('active', layout === l);
          });
          const absentSet = new Set(Array.isArray(currentClass.absentStudents) ? currentClass.absentStudents : []);
          const seatedStudents = this.getAllStudents();
          const presentSeatedCount = seatedStudents.filter(s => !absentSet.has(s)).length;
          const totalClassCount = Array.isArray(currentClass.classList) ? currentClass.classList.length : 0;
          const rosterCountEl = document.getElementById('rosterCount');
          if (rosterCountEl) rosterCountEl.innerText = `${presentSeatedCount}/${totalClassCount}`;

          const chalkboard = document.getElementById('chalkboardFront');
          if (chalkboard) {
            chalkboard.style.display = (layout === 'circle') ? 'none' : 'block';
          }
        }

        this.renderClassDropdown();
        this.renderRoster();
        this.renderClassList();
        this.renderAttendanceTable();
        this.updateSubheaders();
        this.renderChart(currentClass);
      }

      toggleClassListEditMode(targetState) {
        if (typeof targetState === 'boolean') {
          this.isClassListEditMode = targetState;
        } else {
          this.isClassListEditMode = !this.isClassListEditMode;
        }

        const btn = document.getElementById('classListEditBtn');
        const saveBtn = document.getElementById('classListSaveBtn');

        if (btn) {
          if (this.isClassListEditMode) {
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-primary');
          } else {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
          }
        }

        if (saveBtn) {
          saveBtn.style.display = this.isClassListEditMode ? 'inline-block' : 'none';
        }

        this.renderClassList();
      }

      saveClassListEdits() {
        const currentClass = this.getCurrentClass();
        if (!currentClass || !Array.isArray(currentClass.classList)) return;

        const inputs = document.querySelectorAll('#classListUL .class-list-name-input');
        if (inputs.length === 0) {
          this.isClassListEditMode = false;
          this.renderClassList();
          return;
        }

        const renames = [];
        inputs.forEach(inp => {
          const idx = parseInt(inp.getAttribute('data-index'), 10);
          const original = inp.getAttribute('data-original');
          const val = inp.value ? inp.value.trim() : '';
          if (val && val !== original) {
            renames.push({ idx, original, newName: val });
          }
        });

        renames.forEach(r => {
          // 1. Update classList
          currentClass.classList[r.idx] = r.newName;

          // 2. Update rows
          if (Array.isArray(currentClass.rows)) {
            currentClass.rows = currentClass.rows.map(row => Array.isArray(row) ? row.map(n => n === r.original ? r.newName : n) : []);
          }

          // 3. Update circle
          if (Array.isArray(currentClass.circle)) {
            currentClass.circle = currentClass.circle.map(n => n === r.original ? r.newName : n);
          }

          // 4. Update group layouts
          if (currentClass.layoutsData) {
            ['half', 'third', 'fourth', 'fifth'].forEach(key => {
              if (Array.isArray(currentClass.layoutsData[key])) {
                currentClass.layoutsData[key] = currentClass.layoutsData[key].map(g => Array.isArray(g) ? g.map(n => n === r.original ? r.newName : n) : []);
              }
            });
          }

          // 5. Update unplacedStudents
          if (Array.isArray(currentClass.unplacedStudents)) {
            currentClass.unplacedStudents = currentClass.unplacedStudents.map(n => n === r.original ? r.newName : n);
          }
        });

        this.isClassListEditMode = false;
        this.saveData();
        this.render();
      }

      confirmRemoveStudentFromClass(studentName) {
        if (!studentName) return;

        if (this.suppressRemoveStudentWarning) {
          this.removeStudentFromClass(studentName);
          return;
        }

        this.studentPendingRemoval = studentName;
        const warningText = document.getElementById('removeStudentWarningText');
        if (warningText) {
          warningText.textContent = `Are you sure you want to remove "${studentName}" from the class roster? This will remove them from all seating charts, attendance dates, and gradebook records.`;
        }
        const chk = document.getElementById('chkSuppressRemoveWarning');
        if (chk) chk.checked = false;

        const modal = document.getElementById('removeStudentConfirmModal');
        if (modal) modal.classList.add('active');
      }

      executeRemoveStudentFromClass() {
        const studentName = this.studentPendingRemoval;
        if (!studentName) {
          this.closeModal('removeStudentConfirmModal');
          return;
        }

        const chk = document.getElementById('chkSuppressRemoveWarning');
        if (chk && chk.checked) {
          this.suppressRemoveStudentWarning = true;
          localStorage.setItem('seatingApp_suppressRemoveStudentWarning', 'true');
        }

        this.removeStudentFromClass(studentName);
        this.studentPendingRemoval = null;
        this.closeModal('removeStudentConfirmModal');
      }

      removeStudentFromClass(studentName) {
        const currentClass = this.getCurrentClass();
        if (!currentClass || !studentName) return;

        if (Array.isArray(currentClass.classList)) {
          currentClass.classList = currentClass.classList.filter(name => name !== studentName);
        }
        if (Array.isArray(currentClass.rows)) {
          currentClass.rows = currentClass.rows.map(r => Array.isArray(r) ? r.filter(n => n !== studentName) : []);
        }
        if (Array.isArray(currentClass.circle)) {
          currentClass.circle = currentClass.circle.filter(name => name !== studentName);
        }
        if (currentClass.layoutsData) {
          ['half', 'third', 'fourth', 'fifth', 'sixth'].forEach(key => {
            if (Array.isArray(currentClass.layoutsData[key])) {
              currentClass.layoutsData[key] = currentClass.layoutsData[key].map(g => Array.isArray(g) ? g.filter(n => n !== studentName) : []);
            }
          });
        }
        if (Array.isArray(currentClass.lines)) {
          currentClass.lines = currentClass.lines.map(line => Array.isArray(line) ? line.filter(name => name !== studentName) : []);
        }
        if (Array.isArray(currentClass.dividedRowsData)) {
          currentClass.dividedRowsData.forEach(rSecs => {
            if (Array.isArray(rSecs)) {
              rSecs.forEach((sec, idx) => {
                if (Array.isArray(sec)) rSecs[idx] = sec.filter(n => n !== studentName);
              });
            }
          });
        }
        if (Array.isArray(currentClass.unplacedStudents)) {
          currentClass.unplacedStudents = currentClass.unplacedStudents.filter(n => n !== studentName);
        }
        if (currentClass.studentProfiles && currentClass.studentProfiles[studentName]) {
          delete currentClass.studentProfiles[studentName];
        }

        this.saveData();
        this.render();
        if (this.currentViewMode === 'attendance') this.renderAttendanceTable();
        if (this.currentViewMode === 'grades') this.renderGradesTable();
      }

      renderClassList() {
        const ul = document.getElementById('classListUL');
        const countSpan = document.getElementById('classListCount');
        const editBtn = document.getElementById('classListEditBtn');
        const saveBtn = document.getElementById('classListSaveBtn');
        if (!ul) return;
        ul.innerHTML = '';

        if (editBtn) {
          if (this.isClassListEditMode) {
            editBtn.classList.remove('btn-secondary');
            editBtn.classList.add('btn-primary');
          } else {
            editBtn.classList.remove('btn-primary');
            editBtn.classList.add('btn-secondary');
          }
        }

        if (saveBtn) {
          saveBtn.style.display = this.isClassListEditMode ? 'inline-block' : 'none';
        }

        const currentClass = this.getCurrentClass();
        const masterList = (currentClass && currentClass.classList) ? currentClass.classList : [];
        if (countSpan) countSpan.textContent = masterList.length;

        if (masterList.length === 0) {
          ul.innerHTML = '<li class="roster-item" style="color: var(--text-muted); font-style: italic;">No class list created yet</li>';
          return;
        }

        masterList.forEach((student, idx) => {
          const profile = this.getStudentProfile(currentClass, student);
          const fullName = (profile.lastName && profile.lastName.trim())
            ? `${profile.firstName} ${profile.lastName}`
            : (profile.firstName || student);

          const li = document.createElement('li');
          li.className = 'roster-item';
          li.style.cssText = 'padding: 4px 8px; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center; gap: 6px;';

          let delBtnHTML = '';
          let nameHTML = '';

          if (this.isClassListEditMode) {
            nameHTML = `<div style="display: flex; align-items: center; gap: 4px; flex: 1;">
              <span style="font-weight: 600; font-size: 0.8rem; color: #64748b;">${idx + 1}.</span>
              <input type="text" class="class-list-name-input" data-index="${idx}" data-original="${this.escapeQuotes(student)}" value="${this.escapeQuotes(fullName)}" style="flex: 1; padding: 2px 6px; font-size: 0.85rem; border: 1px solid #cbd5e1; border-radius: 4px; background: #ffffff;">
            </div>`;
            delBtnHTML = `<button class="roster-del-btn" style="background: var(--danger); color: white; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 12px; line-height: 1; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; font-weight: bold; box-shadow: 0 1px 3px rgba(0,0,0,0.2);" onclick="event.stopPropagation(); app.confirmRemoveStudentFromClass('${this.escapeQuotes(student)}')" title="Remove Student from Class">&times;</button>`;
          } else {
            nameHTML = `<span>${idx + 1}. ${this.escapeHtml(fullName)}</span>`;
          }

          li.innerHTML = `
            ${nameHTML}
            ${delBtnHTML}
          `;
          ul.appendChild(li);
        });
      }

      deleteAttendanceColumn(dateId) {
        const currentClass = this.getCurrentClass();
        if (!currentClass || !Array.isArray(currentClass.attendanceDates)) return;

        currentClass.attendanceDates = currentClass.attendanceDates.filter(d => d.id !== dateId);
        this.saveData();
        this.renderAttendanceTable();
      }

      renderAttendanceTable() {
        const table = document.getElementById('attendanceTable');
        const classNameSpan = document.getElementById('attendanceClassName');
        if (!table) return;

        const currentClass = this.getCurrentClass();
        if (!currentClass) {
          table.innerHTML = '<tr><td style="padding: 20px; color: var(--text-muted);">No class selected</td></tr>';
          return;
        }

        if (classNameSpan) {
          classNameSpan.textContent = currentClass.name;
        }

        if (!Array.isArray(currentClass.attendanceDates)) {
          currentClass.attendanceDates = this.getDefaultAttendanceDates();
        }

        const classList = currentClass.classList || [];
        const dates = currentClass.attendanceDates;

        // Header Row: Top-left cell empty + date columns with delete button if in edit mode
        let html = '<thead><tr><th></th>';
        dates.forEach(d => {
          const delBtnHTML = this.isEditMode
            ? `<button class="delete-date-col-btn" onclick="event.stopPropagation(); app.deleteAttendanceColumn('${d.id}')" title="Delete Column">&times;</button>`
            : '';

          html += `<th>
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.2; padding: 2px 0;">
              ${delBtnHTML}
              <span style="font-weight: 700; font-size: 0.85rem; color: #0f172a;">${d.date}</span>
              <span style="font-weight: 500; font-size: 0.72rem; color: #64748b; margin-top: 1px; text-transform: none; letter-spacing: 0;">${d.day}</span>
            </div>
          </th>`;
        });
        html += '</tr></thead>';

        // Body Rows: Student Full Name on left + Green Check, Red X, or Blank per date
        html += '<tbody>';
        if (classList.length === 0) {
          html += `<tr><td colspan="${dates.length + 1}" style="text-align: center; color: var(--text-muted); font-style: italic; padding: 24px;">No students in this class list</td></tr>`;
        } else {
          classList.forEach(student => {
            const profile = this.getStudentProfile(currentClass, student);
            const fullName = (profile.lastName && profile.lastName.trim())
              ? `${profile.firstName} ${profile.lastName}`
              : (profile.firstName || student);

            let presentCount = 0;
            let dateCellsHTML = '';

            dates.forEach(d => {
              let status = (d.statuses && d.statuses[student] !== undefined) ? d.statuses[student] : null;

              if (status === null) {
                // Fallback for legacy sample dates
                const seedStr = `${currentClass.id}_${student}_${d.date}`;
                let hash = 0;
                for (let i = 0; i < seedStr.length; i++) {
                  hash = ((hash << 5) - hash) + seedStr.charCodeAt(i);
                  hash |= 0;
                }
                status = ((Math.abs(hash) % 10) >= 3) ? 'present' : 'absent';
              }

              if (status === 'present') {
                presentCount++;
                dateCellsHTML += `<td><span class="attendance-status-present" title="Present">✓</span></td>`;
              } else if (status === 'absent') {
                dateCellsHTML += `<td><span class="attendance-status-absent" title="Absent">✕</span></td>`;
              } else if (status === 'unplaced') {
                dateCellsHTML += `<td></td>`; // Blank box for unplaced student
              } else {
                dateCellsHTML += `<td></td>`;
              }
            });

            const ratioText = `(${presentCount}/${dates.length})`;
            html += `<tr><td><div style="display: flex; justify-content: space-between; align-items: center;"><span>${this.escapeHtml(fullName)}</span><span style="font-size: 0.8rem; font-weight: 700; color: var(--primary); background: #e0e7ff; padding: 2px 6px; border-radius: 10px; margin-left: 8px;">${ratioText}</span></div></td>${dateCellsHTML}</tr>`;
          });
        }
        html += '</tbody>';

        table.innerHTML = html;

        // Bind column hover highlighting for spreadsheet crosshair effect
        if (!table.dataset.hoverBound) {
          table.dataset.hoverBound = 'true';

          table.addEventListener('mouseover', (e) => {
            const cell = e.target.closest('td, th');
            if (!cell) return;
            const colIndex = cell.cellIndex;
            if (colIndex === undefined || colIndex === 0) return;

            const rows = table.querySelectorAll('tr');
            rows.forEach(r => {
              const c = r.children[colIndex];
              if (c) c.classList.add('column-hover');
            });
          });

          table.addEventListener('mouseout', (e) => {
            table.querySelectorAll('.column-hover').forEach(c => c.classList.remove('column-hover'));
          });
        }
      }

      renderClassDropdown() {
        const selectHeader = document.getElementById('classSelect');
        const selectFS = document.getElementById('fullscreenClassSelect');
        const selectAtt = document.getElementById('attendanceClassSelect');
        const selectGrades = document.getElementById('gradesClassSelect');

        [selectHeader, selectFS, selectAtt, selectGrades].forEach(select => {
          if (!select) return;
          select.innerHTML = '';
          this.classes.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            if (c.id === this.currentClassId) opt.selected = true;
            select.appendChild(opt);
          });
          select.value = this.currentClassId;
        });
      }

      renderRoster() {
        const list = document.getElementById('rosterList');
        if (!list) return;
        list.innerHTML = '';

        const currentClass = this.getCurrentClass();
        if (!currentClass) return;

        const absentSet = new Set(Array.isArray(currentClass.absentStudents) ? currentClass.absentStudents : []);
        const allPlaced = this.getAllStudents();
        const unplacedMaster = Array.isArray(currentClass.unplacedStudents) ? currentClass.unplacedStudents : [];

        // Filter into 3 lists:
        // 1. Present = placed students who are NOT in absentSet
        const presentStudents = allPlaced.filter(s => !absentSet.has(s));

        // 2. Absent = all students currently in absentSet
        const absentStudents = Array.from(absentSet);

        // 3. To Be Placed = unplaced students who are NOT in absentSet
        const unplacedStudents = unplacedMaster.filter(s => !absentSet.has(s));

        if (presentStudents.length === 0 && absentStudents.length === 0 && unplacedStudents.length === 0) {
          list.innerHTML = '<li class="roster-item" style="color: var(--text-muted); font-style: italic;">No students added</li>';
          return;
        }

        // --- SECTION 1: PRESENT STUDENTS ---
        const presentHeader = document.createElement('li');
        presentHeader.style.cssText = 'font-weight: 700; color: #059669; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; margin-bottom: 6px; padding: 4px 8px; background: #ecfdf5; border-radius: 4px; pointer-events: none; border-left: 3px solid #10b981; display: flex; justify-content: space-between; align-items: center;';
        presentHeader.innerHTML = `<span>Present (${presentStudents.length})</span>`;
        list.appendChild(presentHeader);

        if (presentStudents.length === 0) {
          const emptyLi = document.createElement('li');
          emptyLi.style.cssText = 'padding: 4px 8px; font-size: 0.8rem; color: #94a3b8; font-style: italic;';
          emptyLi.textContent = 'None';
          list.appendChild(emptyLi);
        } else {
          presentStudents.forEach((student, idx) => {
            const profile = this.getStudentProfile(currentClass, student);
            const displayName = profile.firstName || student;
            const li = document.createElement('li');
            li.className = 'roster-item';
            li.draggable = this.isEditMode;
            if (this.isEditMode) li.title = 'Single click seat to mark absent, Double click to edit card';
            li.innerHTML = `
              <span>${idx + 1}. ${this.escapeHtml(displayName)}</span>
              <button class="roster-del-btn" onclick="event.stopPropagation(); app.removeStudent('${this.escapeQuotes(student)}')" title="Remove Student">&times;</button>
            `;

            li.ondragstart = (e) => this.handleDragStart(e, student, null);
            li.ondragover = (e) => this.handleDragOver(e);
            li.ondragenter = (e) => this.handleDragEnterSeat(e);
            li.ondragleave = (e) => this.handleDragLeaveSeat(e);
            li.ondrop = (e) => this.handleDropOnRosterItem(e, idx);
            li.ondragend = (e) => this.handleDragEnd(e);
            li.ondblclick = (e) => {
              if (this.isEditMode) {
                e.stopPropagation();
                this.openNameCardModal(student);
              }
            };

            list.appendChild(li);
          });
        }

        // --- SECTION 2: ABSENT STUDENTS ---
        const absentHeader = document.createElement('li');
        absentHeader.style.cssText = 'font-weight: 700; color: #dc2626; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 12px; margin-bottom: 6px; padding: 4px 8px; background: #fef2f2; border-radius: 4px; pointer-events: none; border-left: 3px solid #ef4444; display: flex; justify-content: space-between; align-items: center;';
        absentHeader.innerHTML = `<span>Absent (${absentStudents.length})</span>`;
        list.appendChild(absentHeader);

        if (absentStudents.length === 0) {
          const emptyLi = document.createElement('li');
          emptyLi.style.cssText = 'padding: 4px 8px; font-size: 0.8rem; color: #94a3b8; font-style: italic;';
          emptyLi.textContent = 'None';
          list.appendChild(emptyLi);
        } else {
          absentStudents.forEach((student) => {
            const profile = this.getStudentProfile(currentClass, student);
            const displayName = profile.firstName || student;
            const li = document.createElement('li');
            li.className = 'roster-item absent-roster-item';
            li.style.cssText = 'padding: 5px 8px; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 4px; opacity: 0.85;';
            li.title = 'Click to reinstate student';
            li.innerHTML = `
              <span style="text-decoration: line-through; color: #64748b; font-weight: 500;">${this.escapeHtml(displayName)}</span>
              <button class="reinstate-btn" onclick="event.stopPropagation(); app.toggleStudentAbsent('${this.escapeQuotes(student)}')" style="background: var(--primary); color: white; border: none; border-radius: 4px; font-weight: bold; font-size: 0.72rem; padding: 2px 8px; cursor: pointer; transition: background 0.2s ease;">Reinstate</button>
            `;

            li.onclick = () => {
              this.toggleStudentAbsent(student);
            };

            list.appendChild(li);
          });
        }

        // --- SECTION 3: TO BE PLACED STUDENTS ---
        const unplacedHeader = document.createElement('li');
        unplacedHeader.style.cssText = 'font-weight: 700; color: #4338ca; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 12px; margin-bottom: 6px; padding: 4px 8px; background: #e0e7ff; border-radius: 4px; pointer-events: none; border-left: 3px solid #6366f1; display: flex; justify-content: space-between; align-items: center;';
        unplacedHeader.innerHTML = `<span>To Be Placed (${unplacedStudents.length})</span>`;
        list.appendChild(unplacedHeader);

        if (unplacedStudents.length === 0) {
          const emptyLi = document.createElement('li');
          emptyLi.style.cssText = 'padding: 4px 8px; font-size: 0.8rem; color: #94a3b8; font-style: italic;';
          emptyLi.textContent = 'None';
          list.appendChild(emptyLi);
        } else {
          unplacedStudents.forEach((student) => {
            const profile = this.getStudentProfile(currentClass, student);
            const displayName = profile.firstName || student;
            const li = document.createElement('li');
            li.className = 'roster-item unplaced-item';
            li.style.cssText = 'cursor: pointer; background: #fff1f2; border: 1px dashed #fca5a5; color: #991b1b; padding: 6px 10px; border-radius: 6px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;';
            li.title = 'Click to place student on chart';
            li.innerHTML = `
              <span style="font-weight: 600;">+ ${this.escapeHtml(displayName)}</span>
              <span style="font-size: 0.75rem; color: #e11d48; font-weight: bold;">[Place]</span>
            `;

            li.onclick = () => {
              this.placeUnseatedStudent(student);
            };

            list.appendChild(li);
          });
        }
      }

      renderChart(currentClass) {
        const container = document.getElementById('chartContainer');
        container.innerHTML = '';
        container.removeAttribute('style');

        if (!currentClass || !currentClass.classList || currentClass.classList.length === 0) {
          container.className = 'chart-container';
          container.innerHTML = '<div class="empty-state">No students in this class. Add students using the sidebar panel.</div>';
          return;
        }

        const layout = currentClass.layout;
        if (layout === 'rows') {
          this.renderRowsLayout(container, currentClass);
        } else if (layout === 'lines') {
          this.renderLinesLayout(container, currentClass);
        } else if (layout === 'circle') {
          this.renderCircleLayout(container, currentClass);
        } else {
          this.renderGroupedLayout(container, currentClass, layout);
        }
      }

      renderLinesLayout(container, currentClass) {
        container.className = 'chart-container layout-lines';
        const lineCount = currentClass.linesCount || 4;
        const gapPx = lineCount >= 6 ? 10 : (lineCount === 5 ? 14 : 20);
        container.style.cssText = `display: flex; gap: ${gapPx}px; width: 100%; justify-content: center; align-items: flex-start; padding: 0 16px; box-sizing: border-box;`;

        if (!Array.isArray(currentClass.lines)) {
          const all = this.getAllClassStudents(currentClass);
          currentClass.lines = this.autoBalanceGroups(all, lineCount);
        } else {
          while (currentClass.lines.length < lineCount) {
            currentClass.lines.push([]);
          }
        }

        const colPaddingX = lineCount >= 6 ? 6 : 10;
        for (let lIdx = 0; lIdx < lineCount; lIdx++) {
          const lineStudents = currentClass.lines[lIdx] || [];

          const lineDiv = document.createElement('div');
          lineDiv.className = 'line-column';
          lineDiv.id = `line-col-${lIdx}`;
          lineDiv.style.cssText = `flex: 1; min-width: 105px; min-height: 400px; background: rgba(226, 232, 240, 0.4); border: 2px dashed #cbd5e1; border-radius: 10px; padding: 24px ${colPaddingX}px 14px ${colPaddingX}px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 2px; position: relative; transition: background-color 0.2s, border-color 0.2s; box-sizing: border-box;`;

          const sizeKey = `lines-${lIdx}`;
          const savedSize = (currentClass.containerSizes && currentClass.containerSizes[sizeKey]) || null;
          if (savedSize) {
            if (savedSize.width) lineDiv.style.width = `${savedSize.width}px`;
            if (savedSize.height) lineDiv.style.minHeight = `${savedSize.height}px`;
          }

          const badge = document.createElement('div');
          badge.className = 'row-header-badge';
          badge.textContent = `Line ${lIdx + 1} (${lineStudents.length})`;
          lineDiv.appendChild(badge);

          this.makeResizable(lineDiv, sizeKey);

          lineDiv.ondragover = (e) => this.handleDragOver(e);
          lineDiv.ondragenter = (e) => this.handleDragEnterGroup(e, lIdx, 'line-col');
          lineDiv.ondragleave = (e) => this.handleDragLeaveGroup(e, lIdx, 'line-col');
          lineDiv.ondrop = (e) => this.handleDropOnLine(e, lIdx);

          if (lineStudents.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.style.color = 'var(--text-muted)';
            placeholder.style.fontSize = '0.85rem';
            placeholder.style.fontStyle = 'italic';
            placeholder.style.textAlign = 'center';
            placeholder.style.marginTop = '20px';
            placeholder.textContent = 'Drag students here to add to Line ' + (lIdx + 1);
            lineDiv.appendChild(placeholder);
          } else {
            lineStudents.forEach((studentName) => {
              const seatEl = this.createSeatElement(studentName, lIdx);
              lineDiv.appendChild(seatEl);
            });
          }

          container.appendChild(lineDiv);
        }
      }

      handleDropOnLine(e, targetLineIndex) {
        if (!this.isEditMode) return;
        e.preventDefault();
        e.stopPropagation();

        const lineEl = document.getElementById(`line-col-${targetLineIndex}`);
        if (lineEl) lineEl.classList.remove('drag-over');

        if (!this.draggedStudentName) return;

        const currentClass = this.getCurrentClass();
        if (!currentClass || currentClass.layout !== 'lines') return;

        if (Array.isArray(currentClass.unplacedStudents)) {
          currentClass.unplacedStudents = currentClass.unplacedStudents.filter(n => n !== this.draggedStudentName);
        }

        if (!Array.isArray(currentClass.lines)) {
          currentClass.lines = [[], [], [], []];
        }

        currentClass.lines.forEach(l => {
          if (Array.isArray(l)) {
            const idx = l.indexOf(this.draggedStudentName);
            if (idx > -1) l.splice(idx, 1);
          }
        });

        if (!currentClass.lines[targetLineIndex]) {
          currentClass.lines[targetLineIndex] = [];
        }
        currentClass.lines[targetLineIndex].push(this.draggedStudentName);

        this.resetDragState();
        this.saveData();
        this.render();
      }

      renderRowsLayout(container, currentClass) {
        container.className = 'chart-container layout-rows';

        while (currentClass.rows.length < currentClass.rowsCount) {
          currentClass.rows.push([]);
        }

        const isDivided = currentClass.divideRows === true;

        currentClass.rows.forEach((rowStudents, rIndex) => {
          if (rIndex >= currentClass.rowsCount) return;

          const rowDiv = document.createElement('div');
          rowDiv.className = 'seat-row';
          rowDiv.id = `seat-row-${rIndex}`;
          if (!currentClass.rowsRowAlign) {
            currentClass.rowsRowAlign = {};
          }
          const savedAlign = currentClass.rowsRowAlign[rIndex] || currentClass.rowAlignment || 'center';
          rowDiv.style.justifyContent = savedAlign;

          // Render 3 alignment circles at top-center in Edit Mode
          const dotsContainer = document.createElement('div');
          dotsContainer.className = 'row-align-dots';

          const alignments = [
            { val: 'flex-start', title: 'Align Row Left' },
            { val: 'center', title: 'Align Row Center' },
            { val: 'flex-end', title: 'Align Row Right' }
          ];

          alignments.forEach(a => {
            const dot = document.createElement('div');
            dot.className = 'align-dot' + (savedAlign === a.val ? ' active' : '');
            dot.title = a.title;
            dot.onclick = (e) => {
              e.stopPropagation();
              if (!currentClass.rowsRowAlign) currentClass.rowsRowAlign = {};
              currentClass.rowsRowAlign[rIndex] = a.val;
              this.saveData();
              this.render();
            };
            dotsContainer.appendChild(dot);
          });

          rowDiv.appendChild(dotsContainer);

          const sizeKey = `rows-${rIndex}`;
          const savedSize = (currentClass.containerSizes && currentClass.containerSizes[sizeKey]) || null;
          const legacyHeight = (currentClass.containerHeights && currentClass.containerHeights[sizeKey]) || null;

          if (savedSize) {
            if (savedSize.height) rowDiv.style.minHeight = `${savedSize.height}px`;
          } else if (legacyHeight) {
            rowDiv.style.minHeight = `${legacyHeight}px`;
          }

          const badge = document.createElement('div');
          badge.className = 'row-header-badge';
          badge.textContent = `Row ${rIndex + 1} (${rowStudents.length})`;
          rowDiv.appendChild(badge);

          this.makeResizable(rowDiv, sizeKey);

          if (!isDivided) {
            rowDiv.ondragover = (e) => this.handleDragOver(e);
            rowDiv.ondragenter = (e) => this.handleDragEnterGroup(e, rIndex, 'seat-row');
            rowDiv.ondragleave = (e) => this.handleDragLeaveGroup(e, rIndex, 'seat-row');
            rowDiv.ondrop = (e) => this.handleDropOnRow(e, rIndex, 0);

            if (rowStudents.length === 0) {
              const placeholder = document.createElement('div');
              placeholder.style.color = 'var(--text-muted)';
              placeholder.style.fontSize = '0.85rem';
              placeholder.style.fontStyle = 'italic';
              placeholder.style.width = '100%';
              placeholder.style.textAlign = 'center';
              placeholder.textContent = 'Drag students here to add them to Row ' + (rIndex + 1);
              rowDiv.appendChild(placeholder);
            } else {
              rowStudents.forEach((studentName) => {
                const seatEl = this.createSeatElement(studentName, rIndex);
                rowDiv.appendChild(seatEl);
              });
            }
          } else {
            // Divided row layout (Left section & Right section)
            const leftStudents = (currentClass.dividedRowsData && currentClass.dividedRowsData[rIndex] && currentClass.dividedRowsData[rIndex][0]) || [];
            const rightStudents = (currentClass.dividedRowsData && currentClass.dividedRowsData[rIndex] && currentClass.dividedRowsData[rIndex][1]) || [];

            const leftSec = document.createElement('div');
            leftSec.id = `seat-row-${rIndex}-sec-0`;
            leftSec.style.flex = '1';
            leftSec.style.display = 'flex';
            leftSec.style.flexWrap = 'wrap';
            leftSec.style.columnGap = '10px';
            leftSec.style.rowGap = '8px';
            leftSec.style.justifyContent = 'flex-end';
            leftSec.style.alignItems = 'center';
            leftSec.style.alignContent = 'center';
            leftSec.style.minHeight = '65px';
            leftSec.style.padding = '6px';
            leftSec.style.border = '1px dashed #cbd5e1';
            leftSec.style.borderRadius = '6px';
            leftSec.style.background = 'rgba(255,255,255,0.6)';

            leftSec.ondragover = (e) => this.handleDragOver(e);
            leftSec.ondragenter = (e) => this.handleDragEnterGroup(e, `${rIndex}-sec-0`, 'seat-row');
            leftSec.ondragleave = (e) => this.handleDragLeaveGroup(e, `${rIndex}-sec-0`, 'seat-row');
            leftSec.ondrop = (e) => this.handleDropOnRow(e, rIndex, 0);

            if (leftStudents.length === 0) {
              leftSec.innerHTML = '<span style="color: var(--text-muted); font-size: 0.8rem; font-style: italic;">Left Section</span>';
            } else {
              leftStudents.forEach(studentName => {
                const seatEl = this.createSeatElement(studentName, rIndex);
                leftSec.appendChild(seatEl);
              });
            }

            const divider = document.createElement('div');
            divider.style.width = '2px';
            divider.style.height = '80%';
            divider.style.background = 'var(--primary)';
            divider.style.opacity = '0.5';

            const rightSec = document.createElement('div');
            rightSec.id = `seat-row-${rIndex}-sec-1`;
            rightSec.style.flex = '1';
            rightSec.style.display = 'flex';
            rightSec.style.flexWrap = 'wrap';
            rightSec.style.columnGap = '10px';
            rightSec.style.rowGap = '8px';
            rightSec.style.justifyContent = 'flex-start';
            rightSec.style.alignItems = 'center';
            rightSec.style.alignContent = 'center';
            rightSec.style.minHeight = '65px';
            rightSec.style.padding = '6px';
            rightSec.style.border = '1px dashed #cbd5e1';
            rightSec.style.borderRadius = '6px';
            rightSec.style.background = 'rgba(255,255,255,0.6)';

            rightSec.ondragover = (e) => this.handleDragOver(e);
            rightSec.ondragenter = (e) => this.handleDragEnterGroup(e, `${rIndex}-sec-1`, 'seat-row');
            rightSec.ondragleave = (e) => this.handleDragLeaveGroup(e, `${rIndex}-sec-1`, 'seat-row');
            rightSec.ondrop = (e) => this.handleDropOnRow(e, rIndex, 1);

            if (rightStudents.length === 0) {
              rightSec.innerHTML = '<span style="color: var(--text-muted); font-size: 0.8rem; font-style: italic;">Right Section</span>';
            } else {
              rightStudents.forEach(studentName => {
                const seatEl = this.createSeatElement(studentName, rIndex);
                rightSec.appendChild(seatEl);
              });
            }

            rowDiv.appendChild(leftSec);
            rowDiv.appendChild(divider);
            rowDiv.appendChild(rightSec);
          }

          container.appendChild(rowDiv);
        });
      }

      renderCircleLayout(container, currentClass) {
        container.className = 'chart-container layout-circle';
        container.ondragover = (e) => this.handleDragOver(e);

        // Render vertical spread dial on the left of the circle
        const currentFactor = currentClass.circleSpreadFactor || 100;
        const dialContainer = document.createElement('div');
        dialContainer.className = 'circle-dial-container';
        dialContainer.innerHTML = `
          <span class="circle-dial-text">Larger</span>
          <input type="range" class="circle-dial-slider" min="65" max="130" value="${currentFactor}">
          <span class="circle-dial-text">Smaller</span>
        `;

        const slider = dialContainer.querySelector('.circle-dial-slider');

        // Real-time update on input and change
        const updateSpread = (val) => {
          const numVal = parseInt(val, 10);
          if (!isNaN(numVal) && currentClass.circleSpreadFactor !== numVal) {
            currentClass.circleSpreadFactor = numVal;
            this.saveData();
            this.render();
          }
        };

        slider.oninput = (e) => updateSpread(e.target.value);
        slider.onchange = (e) => updateSpread(e.target.value);

        // Custom mouse drag handler for smooth vertical click-and-drag
        slider.onmousedown = (e) => {
          e.stopPropagation();
          const rect = slider.getBoundingClientRect();
          const startY = e.clientY;
          const startVal = parseInt(slider.value, 10);

          const onMouseMove = (moveEvent) => {
            moveEvent.preventDefault();
            const deltaY = startY - moveEvent.clientY; // drag up = increase, drag down = decrease
            const rangePx = rect.height || 160;
            const deltaVal = Math.round((deltaY / rangePx) * 70);
            const newVal = Math.max(60, Math.min(130, startVal + deltaVal));
            slider.value = newVal;
            updateSpread(newVal);
          };

          const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
          };

          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        };

        container.appendChild(dialContainer);

        // Click outside seats unpins any pinned circle seat
        container.onclick = (e) => {
          if (e.target === container) {
            this.pinnedCircleStudent = null;
            container.querySelectorAll('.seat.pinned').forEach(s => s.classList.remove('pinned'));
          }
        };

        const circleStudents = currentClass.circle || [];
        const total = circleStudents.length;
        const spreadMultiplier = (currentClass.circleSpreadFactor || 100) / 100;
        const radius = Math.round(Math.min(242, Math.max(137, Math.round(total * 15.75))) * spreadMultiplier);

        circleStudents.forEach((studentName, idx) => {
          const seatEl = this.createSeatElement(studentName, null);

          if (this.pinnedCircleStudent === studentName) {
            seatEl.classList.add('pinned');
          }

          seatEl.onmouseenter = () => {
            seatEl.classList.add('hover-raised');
          };

          seatEl.onmouseleave = () => {
            seatEl.classList.remove('hover-raised');
          };

          let clickTimer = null;
          seatEl.onclick = (e) => {
            if (this.isEditMode && studentName) {
              e.stopPropagation();
              if (clickTimer) {
                clearTimeout(clickTimer);
                clickTimer = null;
              }
              clickTimer = setTimeout(() => {
                this.toggleStudentAbsent(studentName);
                clickTimer = null;
              }, 220);
              return;
            }

            e.stopPropagation();
            if (this.pinnedCircleStudent === studentName) {
              this.pinnedCircleStudent = null;
              seatEl.classList.remove('pinned');
            } else {
              container.querySelectorAll('.seat.pinned').forEach(s => s.classList.remove('pinned'));
              this.pinnedCircleStudent = studentName;
              seatEl.classList.add('pinned');
            }
          };

          seatEl.ondblclick = (e) => {
            if (this.isEditMode) {
              e.stopPropagation();
              if (clickTimer) {
                clearTimeout(clickTimer);
                clickTimer = null;
              }
              this.openNameCardModal(studentName);
            }
          };

          seatEl.ondragover = (e) => this.handleDragOver(e);
          seatEl.ondragenter = (e) => this.handleDragEnterSeat(e);
          seatEl.ondragleave = (e) => this.handleDragLeaveSeat(e);
          seatEl.ondrop = (e) => this.handleDropOnCircleSeat(e, studentName);

          const angle = (idx / total) * (2 * Math.PI) - (Math.PI / 2);
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          seatEl.style.position = 'absolute';
          seatEl.style.left = `calc(50% + ${x}px - 55px)`;
          seatEl.style.top = `calc(50% + ${y}px - 37px)`;

          container.appendChild(seatEl);
        });
      }

      renderGroupedLayout(container, currentClass, layoutType) {
        container.className = 'chart-container group-rows-container';

        const groupTitles = {
          half: ['Group A', 'Group B'],
          third: ['Group A', 'Group B', 'Group C'],
          fourth: ['Group A', 'Group B', 'Group C', 'Group D'],
          fifth: ['Group A', 'Group B', 'Group C', 'Group D', 'Group E'],
          sixth: ['Group A', 'Group B', 'Group C', 'Group D', 'Group E', 'Group F']
        };

        const titles = groupTitles[layoutType];
        const groups = currentClass.layoutsData[layoutType] || [];

        // Initialize default row structure if not already stored or corrupted
        const rowKey = `${layoutType}Rows`;
        const expectedIndicesCount = titles ? titles.length : 0;
        const existingRowDef = currentClass.layoutsData[rowKey];
        const flatIndicesCount = Array.isArray(existingRowDef) ? existingRowDef.flat().length : 0;

        if (!existingRowDef || flatIndicesCount !== expectedIndicesCount) {
          if (layoutType === 'half') currentClass.layoutsData[rowKey] = [[0, 1]];
          else if (layoutType === 'third') currentClass.layoutsData[rowKey] = [[0, 1], [2]];
          else if (layoutType === 'fourth') currentClass.layoutsData[rowKey] = [[0, 1], [2, 3]];
          else if (layoutType === 'fifth') currentClass.layoutsData[rowKey] = [[0, 1], [4], [2, 3]];
          else if (layoutType === 'sixth') currentClass.layoutsData[rowKey] = [[0, 1], [2, 3], [4, 5]];
        }

        const rows = currentClass.layoutsData[rowKey];
        const alignKey = `${layoutType}RowAlign`;
        if (!currentClass.layoutsData[alignKey]) {
          currentClass.layoutsData[alignKey] = {};
        }

        rows.forEach((rowGroupIndices, rIdx) => {
          const rowSlot = document.createElement('div');
          rowSlot.className = 'group-row-slot';
          rowSlot.id = `group-row-slot-${rIdx}`;

          const savedAlign = currentClass.layoutsData[alignKey][rIdx] || 'center';
          rowSlot.style.justifyContent = savedAlign;

          // Alignment dots control container
          const dotsContainer = document.createElement('div');
          dotsContainer.className = 'row-align-dots';

          const alignments = [
            { val: 'flex-start', title: 'Align Row Left' },
            { val: 'center', title: 'Align Row Center' },
            { val: 'flex-end', title: 'Align Row Right' }
          ];

          alignments.forEach(a => {
            const dot = document.createElement('div');
            dot.className = 'align-dot' + (savedAlign === a.val ? ' active' : '');
            dot.title = a.title;
            dot.onclick = () => {
              currentClass.layoutsData[alignKey][rIdx] = a.val;
              this.saveData();
              this.render();
            };
            dotsContainer.appendChild(dot);
          });

          rowSlot.appendChild(dotsContainer);

          rowSlot.ondragover = (e) => {
            if (this.draggedGroupIndex !== null) {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              rowSlot.classList.add('row-drop-target');
            }
          };
          rowSlot.ondragleave = (e) => {
            if (this.draggedGroupIndex !== null && !rowSlot.contains(e.relatedTarget)) {
              rowSlot.classList.remove('row-drop-target');
            }
          };
          rowSlot.ondrop = (e) => {
            if (this.draggedGroupIndex !== null) {
              rowSlot.classList.remove('row-drop-target');
              this.handleRowDrop(e, rIdx, layoutType);
            }
          };

          rowGroupIndices.forEach((gIndex) => {
            if (gIndex >= titles.length) return;

            const title = titles[gIndex];
            const groupStudents = groups[gIndex] || [];

            const box = document.createElement('div');
            box.className = 'group-box';
            box.id = `group-box-${gIndex}`;

            const sizeKey = `${layoutType}-${gIndex}`;
            const savedSize = (currentClass.containerSizes && currentClass.containerSizes[sizeKey]) || null;
            const legacyHeight = (currentClass.containerHeights && currentClass.containerHeights[sizeKey]) || null;

            if (savedSize) {
              if (savedSize.height) box.style.height = `${savedSize.height}px`;
              if (savedSize.width) box.style.width = `${savedSize.width}px`;
            } else if (legacyHeight) {
              box.style.height = `${legacyHeight}px`;
            }

            const handHandle = document.createElement('div');
            handHandle.className = 'group-drag-handle';
            handHandle.title = 'Drag to move table or swap';
            handHandle.innerHTML = '✋';
            handHandle.draggable = true;
            handHandle.ondragstart = (e) => this.handleGroupDragStart(e, gIndex);
            box.appendChild(handHandle);

            const badge = document.createElement('div');
            badge.className = 'group-header-badge';
            badge.textContent = `${title} (${groupStudents.length})`;
            box.appendChild(badge);

            box.ondragover = (e) => {
              if (this.draggedGroupIndex !== null) this.handleGroupDragOver(e, gIndex);
              else this.handleDragOver(e);
            };
            box.ondragenter = (e) => {
              if (this.draggedGroupIndex !== null) this.handleGroupDragEnter(e, gIndex);
              else this.handleDragEnterGroup(e, gIndex, 'group-box');
            };
            box.ondragleave = (e) => {
              if (this.draggedGroupIndex !== null) this.handleGroupDragLeave(e, gIndex);
              else this.handleDragLeaveGroup(e, gIndex, 'group-box');
            };
            box.ondrop = (e) => {
              if (this.draggedGroupIndex !== null) this.handleGroupDrop(e, gIndex, layoutType);
              else this.handleDropOnGroup(e, gIndex, layoutType);
            };

            this.makeResizable(box, sizeKey);

            if (groupStudents.length === 0) {
              const placeholder = document.createElement('div');
              placeholder.style.color = 'var(--text-muted)';
              placeholder.style.fontSize = '0.85rem';
              placeholder.style.fontStyle = 'italic';
              placeholder.style.width = '100%';
              placeholder.style.textAlign = 'center';
              placeholder.style.alignSelf = 'center';
              placeholder.textContent = 'Drag students here';
              box.appendChild(placeholder);
            } else {
              groupStudents.forEach((studentName) => {
                const seatEl = this.createSeatElement(studentName, gIndex);
                box.appendChild(seatEl);
              });
            }

            rowSlot.appendChild(box);
          });

          container.appendChild(rowSlot);
        });

        // Add bottom drop zone for creating new row at the bottom
        const bottomZone = document.createElement('div');
        bottomZone.className = 'row-add-bottom-zone';
        bottomZone.innerHTML = '+ Drag table here to create a new row at bottom';

        bottomZone.ondragover = (e) => {
          if (this.draggedGroupIndex !== null) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            bottomZone.classList.add('drag-over');
          }
        };
        bottomZone.ondragleave = (e) => {
          if (this.draggedGroupIndex !== null) {
            bottomZone.classList.remove('drag-over');
          }
        };
        bottomZone.ondrop = (e) => {
          if (this.draggedGroupIndex !== null) {
            bottomZone.classList.remove('drag-over');
            this.handleNewRowDrop(e, layoutType);
          }
        };

        container.appendChild(bottomZone);
      }

      getStudentProfile(currentClass, studentName) {
        if (!currentClass) return { firstName: studentName || '', lastName: '' };
        if (!currentClass.studentProfiles) currentClass.studentProfiles = {};
        
        if (currentClass.studentProfiles[studentName]) {
          return currentClass.studentProfiles[studentName];
        }

        const trimmed = (studentName || '').trim();
        const parts = trimmed.split(/\s+/);
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ') || '';
        return { firstName, lastName };
      }

      getStudentInitials(profile) {
        if (!profile) return '?';
        const fInit = profile.firstName && profile.firstName.trim() ? profile.firstName.trim()[0].toUpperCase() : '';
        const lInit = profile.lastName && profile.lastName.trim() ? profile.lastName.trim()[0].toUpperCase() : '';
        return (fInit + lInit) || '?';
      }

      openNameCardModal(studentName) {
        if (!this.isEditMode) return;
        this.editingStudentKey = studentName;
        const currentClass = this.getCurrentClass();
        const profile = this.getStudentProfile(currentClass, studentName);

        document.getElementById('nameCardFirstName').value = profile.firstName || '';
        document.getElementById('nameCardLastName').value = profile.lastName || '';

        this.updateNameCardPreview();
        document.getElementById('nameCardModal').classList.add('active');
      }

      updateNameCardPreview() {
        const fn = document.getElementById('nameCardFirstName').value || '';
        const ln = document.getElementById('nameCardLastName').value || '';
        const initials = this.getStudentInitials({ firstName: fn, lastName: ln });
        const avatarEl = document.getElementById('nameCardAvatar');
        if (avatarEl) avatarEl.textContent = initials;
      }

      saveNameCardProfile() {
        const currentClass = this.getCurrentClass();
        if (!currentClass || !this.editingStudentKey) return;

        const fnInput = document.getElementById('nameCardFirstName');
        const lnInput = document.getElementById('nameCardLastName');

        const newFirstName = fnInput.value ? fnInput.value.trim() : '';
        const newLastName = lnInput.value ? lnInput.value.trim() : '';

        if (!newFirstName) {
          alert('Please enter a first name.');
          return;
        }

        if (!currentClass.studentProfiles) currentClass.studentProfiles = {};

        const oldKey = this.editingStudentKey;

        // Store profile with newFirstName as primary identifier key
        currentClass.studentProfiles[newFirstName] = {
          firstName: newFirstName,
          lastName: newLastName
        };

        if (oldKey !== newFirstName) {
          delete currentClass.studentProfiles[oldKey];

          if (Array.isArray(currentClass.classList)) {
            currentClass.classList = currentClass.classList.map(n => n === oldKey ? newFirstName : n);
          }
          if (Array.isArray(currentClass.rows)) {
            currentClass.rows = currentClass.rows.map(r => Array.isArray(r) ? r.map(n => n === oldKey ? newFirstName : n) : []);
          }
          if (Array.isArray(currentClass.circle)) {
            currentClass.circle = currentClass.circle.map(n => n === oldKey ? newFirstName : n);
          }
          if (currentClass.layoutsData) {
            ['half', 'third', 'fourth', 'fifth'].forEach(key => {
              if (Array.isArray(currentClass.layoutsData[key])) {
                currentClass.layoutsData[key] = currentClass.layoutsData[key].map(g => Array.isArray(g) ? g.map(n => n === oldKey ? newFirstName : n) : []);
              }
            });
          }
          if (Array.isArray(currentClass.unplacedStudents)) {
            currentClass.unplacedStudents = currentClass.unplacedStudents.map(n => n === oldKey ? newFirstName : n);
          }
          if (Array.isArray(currentClass.dividedRowsData)) {
            currentClass.dividedRowsData.forEach(rSecs => {
              if (Array.isArray(rSecs)) {
                rSecs.forEach((sec, idx) => {
                  if (Array.isArray(sec)) rSecs[idx] = sec.map(n => n === oldKey ? newFirstName : n);
                });
              }
            });
          }
        }

        this.saveData();
        this.render();
        this.closeModal('nameCardModal');
      }

      createSeatElement(name, groupIndex) {
        const safeName = (name === null || name === undefined) ? '' : String(name);
        const currentClass = this.getCurrentClass();
        const showFaces = currentClass ? (currentClass.showFaces !== false) : true;
        const isAbsent = this.isStudentAbsent(currentClass, safeName);

        const profile = this.getStudentProfile(currentClass, safeName);
        const displayName = profile.firstName || safeName;
        const initials = this.getStudentInitials(profile);

        const seat = document.createElement('div');
        seat.className = 'seat' + (showFaces ? '' : ' no-faces') + (isAbsent ? ' seat-absent' : '');
        seat.draggable = this.isEditMode;

        let nameDisplayHTML = this.escapeHtml(displayName);

        seat.innerHTML = `
          <button class="remove-btn" onclick="event.stopPropagation(); app.removeStudent('${this.escapeQuotes(safeName)}')" title="Remove">&times;</button>
          ${showFaces ? `<div class="avatar">${initials}</div>` : ''}
          <div class="student-name">${nameDisplayHTML}</div>
        `;

        if (this.isGradeScoringActive && safeName) {
          const score = (this.activeGradeSession && this.activeGradeSession.scores)
            ? (this.activeGradeSession.scores[safeName] || '')
            : '';
          const isCheck = (score === 'check');
          const isMinus = (score === 'minus');
          const isX = (score === 'x');

          const scoreControls = document.createElement('div');
          scoreControls.className = 'grade-score-controls';
          scoreControls.classList.add('grade-score-controls');
          scoreControls.innerHTML = `
            <button class="grade-score-btn grade-btn-plus ${isCheck ? 'active-check' : ''}" onclick="event.stopPropagation(); app.recordLiveGradeScore('${this.escapeQuotes(safeName)}', 'plus')" title="Exceeds / Pass (✓)">${isCheck ? '✓' : '+'}</button>
            <button class="grade-score-btn grade-btn-minus ${isMinus ? 'active-minus' : (isX ? 'active-x' : '')}" onclick="event.stopPropagation(); app.recordLiveGradeScore('${this.escapeQuotes(safeName)}', 'minus')" title="Click for Minus (−), double-click for X (✕)">${isX ? '✕' : '−'}</button>
          `;
          seat.appendChild(scoreControls);
        }

        let clickTimer = null;
        seat.onclick = (e) => {
          if (this.isEditMode && safeName) {
            e.stopPropagation();
            if (clickTimer) {
              clearTimeout(clickTimer);
              clickTimer = null;
            }
            clickTimer = setTimeout(() => {
              this.toggleStudentAbsent(safeName);
              clickTimer = null;
            }, 220);
          }
        };

        seat.ondragstart = (e) => this.handleDragStart(e, safeName, groupIndex);
        seat.ondragover = (e) => this.handleDragOver(e);
        seat.ondragenter = (e) => this.handleDragEnterSeat(e);
        seat.ondragleave = (e) => this.handleDragLeaveSeat(e);
        seat.ondrop = (e) => this.handleDropOnSeat(e, safeName, groupIndex);
        seat.ondragend = (e) => this.handleDragEnd(e);
        seat.ondblclick = (e) => {
          if (this.isEditMode) {
            e.stopPropagation();
            if (clickTimer) {
              clearTimeout(clickTimer);
              clickTimer = null;
            }
            this.openNameCardModal(safeName);
          }
        };

        return seat;
      }

      escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/&/g, "&amp;")
                          .replace(/</g, "&lt;")
                          .replace(/>/g, "&gt;")
                          .replace(/"/g, "&quot;")
                          .replace(/'/g, "&#039;");
      }

      escapeQuotes(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
      }
    }

    const app = new SeatingChartApp();
    window.app = app;