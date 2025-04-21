const filterIdApi = async () => {
    const level4Items = [];
    try {
        const url = 'https://partner-finder.oracle.com/catalog/api/file/OPN-EXPERTISELIST-DF';
        const response = await fetch(url);
        const expertiseData = await response.json();

        if (expertiseData.expertiseList && Array.isArray(expertiseData.expertiseList)) {
            expertiseData.expertiseList.forEach(level1 => {
                if (level1.level_2_list && Array.isArray(level1.level_2_list)) {
                    level1.level_2_list.forEach(level2 => {
                        if (level2.level_3_list && Array.isArray(level2.level_3_list)) {
                            level2.level_3_list.forEach(level3 => {
                                const ucm_column = level3.ucm_column;
                                if (level3.level_4_list && Array.isArray(level3.level_4_list)) {
                                    level3.level_4_list.forEach(level4 => {
                                        level4Items.push({
                                            ucm_column,
                                            id: level4.id,
                                            filterName: level4.name,
                                        });
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }

        console.log('Extracted Level 4 Expertise IDs and Names:', level4Items);
    } catch (error) {
        console.error('Error fetching expertise list:', error.message);
    }
    return level4Items;
}
module.exports = filterIdApi;